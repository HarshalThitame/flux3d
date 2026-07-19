import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { verifyCheckoutPayment } from '@/lib/payments/service'
import { rateLimitResponse } from '@/lib/rate-limit'

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

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'razorpay_verify',
    windowSeconds: 60,
    maxRequests: 20,
    userId: authData.user.id,
  })
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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

    const result = await verifyCheckoutPayment({
      internalOrderType,
      internalOrderId,
      customerId: authData.user.id,
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

