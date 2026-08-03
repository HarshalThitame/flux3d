import { NextResponse } from 'next/server'
import { ingestRazorpayWebhook, processWebhookEventById } from '@/lib/payments/service'
import { enqueuePaymentWebhookProcessing } from '@/lib/payments/queue'
import { rateLimitCheck } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

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

    // Process the event synchronously inline as the primary path. This is the
    // reliable approach (used before the queue refactor) so payment
    // confirmations are never stranded by an upstream delivery failure. The
    // QStash worker is only a best-effort backup retry now.
    if (ingested.eventId) {
      try {
        const outcome = await processWebhookEventById(ingested.eventId)
        return NextResponse.json({
          acknowledged: outcome.acknowledged,
          duplicate: outcome.duplicate,
          processed: true,
        })
      } catch (processError) {
        console.error('[webhooks/razorpay] Inline processing failed:', processError)
        // Best-effort: hand off to the durable worker for a retry, then return
        // 5xx so Razorpay replays the webhook. Re-processing is idempotent
        // (dedup on provider event id + capture sibling check), so retries are
        // safe.
        const queued = await enqueuePaymentWebhookProcessing(ingested.eventId).catch(() => false)
        return NextResponse.json(
          {
            acknowledged: ingested.acknowledged,
            duplicate: ingested.duplicate,
            enqueued: queued,
            error: processError instanceof Error ? processError.message : 'Processing failed',
          },
          { status: 500 },
        )
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

