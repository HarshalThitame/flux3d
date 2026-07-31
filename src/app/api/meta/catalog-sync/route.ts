import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { upsertMetaCatalogItem, deleteMetaCatalogItem } from '@/lib/meta/catalog'
import { rateLimitCheck } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const PAYLOAD_LIMIT = 1024 * 200

async function verifyWebhookSecret(request: Request): Promise<boolean> {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET
  if (!secret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader.slice(7)),
      Buffer.from(secret),
    )
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!(await verifyWebhookSecret(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded?.split(',')[0]?.trim() ?? 'meta-catalog-sync'
  const rateLimit = await rateLimitCheck(`meta_catalog_sync:${clientIp}`, 60, 30)
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const rawBody = await request.text()
  if (rawBody.length > PAYLOAD_LIMIT) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = payload.type as string | undefined
  const table = payload.table as string | undefined

  if (table !== 'shelf_products') {
    return NextResponse.json({ success: true, skipped: true, reason: `Unwatched table: ${table}` })
  }

  const record = payload.record as Record<string, unknown> | undefined
  const oldRecord = payload.old_record as Record<string, unknown> | undefined

  const processing = (async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return

    const supabase = createClient(supabaseUrl, serviceKey)

    const logSync = async (severity: string, message: string, metadata: Record<string, unknown>) => {
      try {
        await supabase.from('error_logs').insert({
          source: 'meta_catalog_sync',
          severity,
          message,
          metadata,
        })
      } catch (e) {
        console.error('[meta/catalog-sync] Log write failed:', e)
      }
    }

    try {
      if (eventType === 'DELETE' && oldRecord) {
        const slug = oldRecord.slug as string
        const result = await deleteMetaCatalogItem(slug)

        if (result.success) {
          await supabase.from('shelf_products').update({
            meta_item_id: null,
            meta_synced_at: new Date().toISOString(),
            meta_sync_error: null,
          }).eq('slug', slug)
        }

        await logSync(
          result.success ? 'info' : 'error',
          result.success ? `Deleted ${slug} from Meta catalog` : `Failed to delete ${slug} from Meta catalog`,
          { action: 'delete', slug, result },
        )
        return
      }

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (!record) return
        const productId = record.id as string

        const { data: product } = await supabase
          .from('shelf_products')
          .select(`
            id, name, slug, description, thumbnail_url, image_urls,
            is_active, is_archived, base_price,
            category:category_id(name),
            skus:shelf_skus(id, sku_code, price, stock_quantity, is_available, variant_combination, variant_image_url)
          `)
          .eq('id', productId)
          .single()

        if (!product) return

        const result = await upsertMetaCatalogItem({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          thumbnail_url: product.thumbnail_url,
          image_urls: product.image_urls,
          is_active: product.is_active,
          is_archived: product.is_archived,
          base_price: product.base_price,
          category_name: Array.isArray(product.category) ? product.category[0]?.name ?? null : (product.category as Record<string, string> | null)?.name ?? null,
          skus: product.skus,
        })

        const failed = result.filter((a) => !a.success)
        const allSucceeded = failed.length === 0
        const primaryHandle = allSucceeded ? result[0]?.metaHandle : null

        await supabase.from('shelf_products').update({
          meta_item_id: primaryHandle,
          meta_synced_at: new Date().toISOString(),
          meta_sync_error: allSucceeded ? null : `Partial sync failure: ${failed.length} SKU(s) failed`,
        }).eq('id', productId)

        await logSync(
          allSucceeded ? 'info' : 'warning',
          `Synced product ${product.name} to Meta catalog: ${result.filter((a) => a.success).length} ok, ${failed.length} failed`,
          { action: eventType === 'INSERT' ? 'create' : 'update', productId, slug: product.slug, results: result },
        )
      }
    } catch (error) {
      console.error('[meta/catalog-sync] Error:', error)
      await logSync('error', error instanceof Error ? error.message : String(error), { eventType, payload })
    }
  })()

  processing.catch((err) => {
    console.error('[meta/catalog-sync] Async processing failed:', err)
  })

  return NextResponse.json({ success: true, message: 'Catalog sync triggered' })
}