import { NextResponse } from 'next/server'
import { processRazorpayWebhook } from '@/lib/payments/service'
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
    const result = await processRazorpayWebhook({
      rawBody,
      signature,
      eventId,
    })

    return NextResponse.json({
      acknowledged: result.acknowledged,
      duplicate: result.duplicate,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed.' },
      { status: 400 }
    )
  }
}

