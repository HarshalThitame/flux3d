import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
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

  // Return 200 immediately, process async
  const syncPromise = (async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
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
