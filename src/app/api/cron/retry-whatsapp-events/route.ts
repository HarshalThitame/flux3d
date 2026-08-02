import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { parseWhatsAppMessage } from '@/lib/whatsapp/message-parser'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader.slice(7)),
      Buffer.from(cronSecret),
    )
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  if (!await verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  // Fetch events that need retrying
  const { data: events, error: fetchError } = await supabase
    .rpc('get_retryable_webhook_events', {
      p_max_retries: 3,
      p_cooldown_minutes: 5,
      p_batch_size: 10,
    })

  if (fetchError) {
    console.error('[cron] Failed to fetch retryable events:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ success: true, retriedCount: 0 })
  }

  let retriedCount = 0
  let failedCount = 0

  for (const event of events) {
    try {
      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
      const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
      const from = message?.from
      const { text, interaction } = parseWhatsAppMessage(message)

      if (!from || (typeof text !== 'string' && !interaction)) {
        // No actionable message — mark as processed to skip future retries
        await supabase
          .from('whatsapp_webhook_events')
          .update({ processed_at: new Date().toISOString(), reply_sent: false })
          .eq('id', event.id)
        retriedCount++
        continue
      }

      // Mark as currently being retried (prevents parallel retries)
      await supabase
        .from('whatsapp_webhook_events')
        .update({
          last_retried_at: new Date().toISOString(),
          payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
        })
        .eq('id', event.id)

      // Import and run the message processor
      const { processIncomingMessage } = await import('@/pages/api/whatsapp')

      const requestStartedAt = Date.now()
      await processIncomingMessage({
        supabase,
        payloadHash: event.payload_hash,
        payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
        from,
        text: text ?? '',
        interaction,
        eventRecord: { id: event.id },
        requestStartedAt,
      })

      retriedCount++
    } catch (error) {
      failedCount++
      console.error(`[cron] Retry failed for event ${event.id}:`, error)
    }
  }

  return NextResponse.json({
    success: true,
    retriedCount,
    failedCount,
    totalAttempted: events.length,
  })
}
