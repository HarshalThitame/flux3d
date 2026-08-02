import { NextResponse } from 'next/server'
import { ingestRazorpayWebhook, processWebhookEventById } from '@/lib/payments/service'
import { enqueuePaymentWebhookProcessing } from '@/lib/payments/queue'
import { rateLimitCheck } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')?.trim() || ''
  const eventId = request.headers.get('x-razorpay-event-id')?.trim() || ''

  if (!signature || !eventId) {
    return NextResponse.json({ error: 'Missing webhook headers.' }, { status: 400 })
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded?.split(',')[0]?.trim() ?? 'razorpay'
  const rateLimit = await rateLimitCheck(
    `razorpay_webhook:${clientIp}`,
    60,
    30,
  )
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    // Fast path: verify signature + persist the event, then return 200.
    const ingested = await ingestRazorpayWebhook({ rawBody, signature, eventId })

    // Enqueue the heavy processing to a durable QStash worker.
    if (ingested.eventId) {
      const queued = await enqueuePaymentWebhookProcessing(ingested.eventId)
      if (!queued) {
        // QStash unavailable — fall back to synchronous processing inline.
        // The 200 response is delayed in this (rare) case, same as the WhatsApp
        // webhook fallback. The queue is the primary path.
        try {
          const outcome = await processWebhookEventById(ingested.eventId)
          return NextResponse.json({
            acknowledged: outcome.acknowledged,
            duplicate: outcome.duplicate,
          })
        } catch (processError) {
          console.error('[payments] Inline fallback processing failed:', processError)
          return NextResponse.json(
            { error: 'Webhook enqueued but inline fallback failed.' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      acknowledged: ingested.acknowledged,
      duplicate: ingested.duplicate,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed.' },
      { status: 400 }
    )
  }
}

// Re-export for any callers/tests that imported the old synchronous function.
export { processRazorpayWebhook } from '@/lib/payments/service'

