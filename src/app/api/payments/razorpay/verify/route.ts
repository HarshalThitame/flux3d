import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { verifyCheckoutPayment } from '@/lib/payments/service'
import { rateLimitResponse, buildRateLimitKey, rateLimitCheck } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type VerifyBody = {
  internalOrderType?: unknown
  internalOrderId?: unknown
  razorpay_order_id?: unknown
  razorpay_payment_id?: unknown
  razorpay_signature?: unknown
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  const guestToken = request.headers.get('x-guest-order-token')?.trim() || ''
  let userId: string | null = null

  if (!authError && authData.user) {
    userId = authData.user.id
  }

  try {
    const body = (await request.json()) as VerifyBody
    const internalOrderType = normalizeText(body.internalOrderType) as 'shop_order' | 'custom_quote'
    const internalOrderId = normalizeText(body.internalOrderId)
    const razorpayOrderId = normalizeText(body.razorpay_order_id)
    const razorpayPaymentId = normalizeText(body.razorpay_payment_id)
    const razorpaySignature = normalizeText(body.razorpay_signature)

    if (!internalOrderType || !internalOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing verification details.' }, { status: 400 })
    }

    // Guest orders are authorized inside verifyCheckoutPayment via the token;
    // here we only require *some* credential before doing any work.
    if (!userId && !guestToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitOptions = {
      prefix: 'razorpay_verify',
      windowSeconds: 60,
      maxRequests: 20,
      ...(userId ? { userId } : {}),
    }
    const rateLimit = userId
      ? await rateLimitResponse(request, rateLimitOptions)
      : await rateLimitCheck(buildRateLimitKey(request, `razorpay_verify:${internalOrderId}`), 60, 20)
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const result = await verifyCheckoutPayment({
      internalOrderType,
      internalOrderId,
      customerId: userId,
      guestAccessToken: guestToken || null,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    })

    return NextResponse.json({
      status: result.status,
      internalOrderType,
      internalOrderId,
      paymentStatus: result.paymentAttempt.status,
      providerOrderId: result.paymentAttempt.provider_order_id,
      providerPaymentId: result.paymentAttempt.provider_payment_id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not verify payment.' },
      { status: 400 }
    )
  }
}
