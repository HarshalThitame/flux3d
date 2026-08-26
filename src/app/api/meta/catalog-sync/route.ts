import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { upsertMetaCatalogItem, deleteMetaCatalogItem, buildCatalogEntries, toCatalogRetailerId } from '@/lib/meta/catalog'
import { mergeStoredCatalogHashes, queueCatalogDeletes } from '@/lib/meta/sync-state'
import { sendOpsAlert } from '@/lib/alerts'
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
  // Defense-in-depth: the Supabase trigger also sends a marker header.
  // Reject Bearer-only requests (e.g. secret reuse sprayed at this endpoint).
  if (request.headers.get('x-meta-catalog-sync') !== 'v1') return false
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

  if (table !== 'shelf_products' && table !== 'shelf_skus') {
    return NextResponse.json({ success: true, skipped: true, reason: `Unwatched table: ${table}` })
  }

  const record = payload.record as Record<string, unknown> | undefined
  const oldRecord = payload.old_record as Record<string, unknown> | undefined

  // Prevent webhook feedback loop on shelf_products: our own meta tracking write-back
  // (meta_item_id, meta_synced_at, meta_sync_error) must not re-trigger a sync. The
  // BEFORE UPDATE trigger set_shelf_products_updated_at bumps updated_at on every
  // write-back, so updated_at is also treated as a write-back-only column. A legitimate
  // product edit still syncs because it changes a non-tracking column (name, price, ...).
  // Two independent safeguards:
  //   1. Column diff: skip when the ONLY changed columns are the tracking ones.
  //   2. Recency: skip when meta_synced_at was just written (covers payloads whose
  //      old_record is absent).
  // This guard is shelf_products-specific: the sync never writes to shelf_skus, so SKU
  // webhooks cannot self-loop.
  const META_TRACKING_COLUMNS = ['meta_item_id', 'meta_synced_at', 'meta_sync_error', 'updated_at']
  if (table === 'shelf_products' && eventType === 'UPDATE' && record) {
    let isWriteBack = false
    if (oldRecord) {
      const changedColumns = Object.keys(record).filter(
        (key) => JSON.stringify(record[key]) !== JSON.stringify(oldRecord[key]),
      )
      isWriteBack =
        changedColumns.length > 0 &&
        changedColumns.every((column) => META_TRACKING_COLUMNS.includes(column))
    } else {
      const syncedAt = typeof record.meta_synced_at === 'string' ? Date.parse(record.meta_synced_at) : NaN
      isWriteBack = Number.isFinite(syncedAt) && Date.now() - syncedAt < 60_000
    }
    if (isWriteBack) {
      return NextResponse.json({ success: true, skipped: true, reason: 'meta tracking write-back' })
    }
  }

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
          error_message: message,
          metadata,
        })
      } catch (e) {
        console.error('[meta/catalog-sync] Log write failed:', e)
      }
    }

    const syncProduct = async (productId: string, action: 'create' | 'update') => {
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

      // Persist the current payload hashes so the change-aware cron skips these
      // items on its next run instead of re-triggering WhatsApp review. Only
      // successful SKUs are recorded — a failed push (e.g. retailer_id over
      // Meta's 100-char limit) must be retried, not skipped forever.
      const entries = buildCatalogEntries({
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
      try {
        // Atomic server-side merge — no read-modify-write, so this cannot clobber
        // hash updates persisted by a concurrently running full-sync cron.
        const succeededHashes: Record<string, string> = {}
        const succeededSkus = new Set(result.filter((a) => a.success).map((a) => a.skuCode))
        for (const entry of entries) {
          if (succeededSkus.has(entry.retailerId)) {
            succeededHashes[entry.retailerId] = entry.hash
          }
        }
        await mergeStoredCatalogHashes(succeededHashes)
      } catch (e) {
        console.error('[meta/catalog-sync] Failed to persist payload hashes:', e)
      }

      await logSync(
        allSucceeded ? 'info' : 'warning',
        `Synced product ${product.name} to Meta catalog: ${result.filter((a) => a.success).length} ok, ${failed.length} failed`,
        { action, productId, slug: product.slug, results: result },
      )
    }

    try {
      if (eventType === 'DELETE' && oldRecord) {
        if (table === 'shelf_products') {
          const slug = oldRecord.slug as string
          const result = await deleteMetaCatalogItem(slug)

          if (result.success) {
            await supabase.from('shelf_products').update({
              meta_item_id: null,
              meta_synced_at: new Date().toISOString(),
              meta_sync_error: null,
            }).eq('slug', slug)
          } else {
            // Queue for the cron's delete-retry pass — otherwise a transient
            // failure leaves the stale item visible in the catalog forever.
            await queueCatalogDeletes([toCatalogRetailerId(slug)])
          }

          await logSync(
            result.success ? 'info' : 'error',
            result.success ? `Deleted ${slug} from Meta catalog` : `Failed to delete ${slug} from Meta catalog (queued for retry)`,
            { action: 'delete', table, slug, result },
          )
          return
        }

        if (table === 'shelf_skus') {
          const skuCode = oldRecord.sku_code as string
          if (!skuCode) return

          const result = await deleteMetaCatalogItem(skuCode)
          if (!result.success) {
            await queueCatalogDeletes([toCatalogRetailerId(skuCode)])
          }
          await logSync(
            result.success ? 'info' : 'error',
            result.success ? `Deleted SKU ${skuCode} from Meta catalog` : `Failed to delete SKU ${skuCode} from Meta catalog (queued for retry)`,
            { action: 'delete', table, skuCode, result },
          )
          return
        }
      }

      // SKU rename: the OLD retailer_id would stay orphaned in the catalog
      // (only hard DELETE events clean up). Delete the old id explicitly.
      if (table === 'shelf_skus' && eventType === 'UPDATE' && record && oldRecord) {
        const newSku = typeof record.sku_code === 'string' ? record.sku_code : ''
        const oldSku = typeof oldRecord.sku_code === 'string' ? oldRecord.sku_code : ''
        if (newSku && oldSku && newSku !== oldSku) {
          const result = await deleteMetaCatalogItem(oldSku)
          if (!result.success) {
            await queueCatalogDeletes([toCatalogRetailerId(oldSku)])
          }
          await logSync(
            result.success ? 'info' : 'warning',
            `SKU renamed ${oldSku} -> ${newSku}; old catalog item ${result.success ? 'deleted' : 'delete queued for retry'}`,
            { action: 'rename', table, oldSku, newSku },
          )
        }
      }

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (!record) return
        const productId =
          table === 'shelf_skus' ? (record.product_id as string) : (record.id as string)
        if (!productId) return

        await syncProduct(productId, eventType === 'INSERT' ? 'create' : 'update')
      }
    } catch (error) {
      console.error('[meta/catalog-sync] Error:', error)
      await logSync('error', error instanceof Error ? error.message : String(error), { eventType, table, payload })
      // Real-time sync path failed; the 6-hourly cron will reconcile, but ops
      // should know the realtime pipeline is degraded.
      void sendOpsAlert({
        key: 'meta_catalog_webhook_error',
        severity: 'error',
        source: 'meta_catalog_sync',
        subject: 'Meta catalog realtime sync failed',
        body:
          `A Supabase-triggered catalog sync threw an exception. The change will be\n` +
          `reconciled by the next cron run, but this indicates a degraded realtime pipeline.\n\n` +
          `Event: ${eventType} on ${table}\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { eventType, table },
      })
    }
  })()

  await processing.catch((err) => {
    console.error('[meta/catalog-sync] Async processing failed:', err)
  })

  return NextResponse.json({ success: true, message: 'Catalog sync processed' })
}