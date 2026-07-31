import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { upsertMetaCatalogItem, deleteMetaCatalogItem } from '@/lib/meta/catalog'
import { syncProductKnowledgeChunks } from '@/lib/whatsapp-rag'
import { rateLimitCheck } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const WEBHOOK_PAYLOAD_LIMIT = 1024 * 100 // 100KB

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
  // Validate webhook secret
  if (!await verifyWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if sync is enabled
  if ((process.env.WHATSAPP_SYNC_ENABLED ?? 'true') === 'false') {
    return NextResponse.json({ success: true, skipped: true })
  }

  // Rate limit: 10 requests per 60 seconds
  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded?.split(',')[0]?.trim() ?? 'supabase-webhook'
  const rateLimit = await rateLimitCheck(`supabase_product_sync:${clientIp}`, 60, 10)
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const startedAt = Date.now()

  // Read and discard body (validated by signature, not processed)
  const rawBody = await request.text()
  if (rawBody.length > WEBHOOK_PAYLOAD_LIMIT) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let payload: Record<string, unknown> = {}
  try { payload = JSON.parse(rawBody) } catch { /* ignore parse errors */ }

  const eventType = payload.type as string | undefined
  const table = payload.table as string | undefined

  // Return 200 immediately, process async
  const syncPromise = (async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
      // Handle Meta catalog sync for shelf_products changes
      if (table === 'shelf_products') {
        const record = payload.record as Record<string, unknown> | undefined
        const oldRecord = payload.old_record as Record<string, unknown> | undefined

        if (eventType === 'DELETE' && oldRecord) {
          const slug = oldRecord.slug as string
          await deleteMetaCatalogItem(slug)
        }

        if ((eventType === 'INSERT' || eventType === 'UPDATE') && record) {
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

          if (product) {
            await upsertMetaCatalogItem({
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
          }
        }
      }

      // Also run WhatsApp RAG knowledge sync
      const result = await syncProductKnowledgeChunks()

      // Log to audit table
      await supabase.from('whatsapp_rag_answer_audits').insert({
        webhook_event_id: null,
        sender: null,
        user_id: null,
        question_text: '[SYNC]',
        retrieval_mode: 'none',
        retrieval_confidence: 0,
        retrieval_sources: [],
        response_kind: 'model',
        response_text: JSON.stringify({
          action: 'webhook_sync',
          table: (payload as any)?.table ?? 'unknown',
          event: (payload as any)?.event ?? 'unknown',
          syncedCount: result.syncedCount,
        }),
        response_metadata: {
          source: 'webhook_product_sync',
          trigger: payload,
          duration_ms: Date.now() - startedAt,
        },
        fallback_reason: null,
        model_name: null,
        prompt_version: 'whatsapp-rag-v2',
        latency_ms: Date.now() - startedAt,
        retrieval_latency_ms: null,
        generation_latency_ms: null,
        session_history_length: null,
        structured_data_matches: null,
      })
    } catch (error) {
      console.error('[webhook] Product sync failed:', error)
      await supabase.from('whatsapp_rag_answer_audits').insert({
        webhook_event_id: null,
        sender: null,
        user_id: null,
        question_text: '[SYNC]',
        retrieval_mode: 'none',
        retrieval_confidence: 0,
        retrieval_sources: [],
        response_kind: 'error',
        response_text: JSON.stringify({
          action: 'webhook_sync',
          error: error instanceof Error ? error.message : String(error),
        }),
        response_metadata: { source: 'webhook_product_sync', trigger: payload },
        fallback_reason: 'sync_failure',
        model_name: null,
        prompt_version: 'whatsapp-rag-v2',
        latency_ms: Date.now() - startedAt,
        retrieval_latency_ms: null,
        generation_latency_ms: null,
        session_history_length: null,
        structured_data_matches: null,
      })
    }
  })()

  // Fire and forget (Vercel will keep the function alive for up to maxDuration)
  syncPromise.catch((error) => {
    console.error('[webhook] Async sync failed:', error)
  })

  return NextResponse.json({ success: true, message: 'Sync triggered' })
}
