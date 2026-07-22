import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/payments/service'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CreateOrderBody = {
  internalOrderType?: unknown
  internalOrderId?: unknown
  paymentPurpose?: unknown
  expectedAmountPaise?: unknown
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
    prefix: 'razorpay_create_order',
    windowSeconds: 60,
    maxRequests: 10,
    userId: authData.user.id,
  })
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as CreateOrderBody
    const internalOrderType = normalizeText(body.internalOrderType) as 'shop_order' | 'custom_quote'
    const internalOrderId = normalizeText(body.internalOrderId)
    const paymentPurpose = normalizeText(body.paymentPurpose) as 'shop_order' | 'custom_quote_full_payment' | 'custom_quote_deposit' | 'custom_quote_balance'
    const expectedAmountPaise = Number(body.expectedAmountPaise)

    if (!internalOrderType || !internalOrderId) {
      return NextResponse.json({ error: 'Order details are required.' }, { status: 400 })
    }

    if (!['shop_order', 'custom_quote'].includes(internalOrderType)) {
      return NextResponse.json({ error: 'Unsupported payment target.' }, { status: 400 })
    }

    const result = await createCheckoutSession({
      type: internalOrderType,
      id: internalOrderId,
      customerId: authData.user.id,
      paymentPurpose: paymentPurpose || undefined,
      ...(Number.isFinite(expectedAmountPaise) && expectedAmountPaise > 0 ? { expectedAmountPaise } : {}),
    })

    return NextResponse.json({
      keyId: result.session.keyId,
      orderId: result.session.orderId,
      amount: result.session.amount,
      currency: result.session.currency,
      name: result.session.name,
      description: result.session.description,
      reference: result.session.reference,
      customer: result.session.customer,
      notes: result.session.notes,
      theme: result.session.theme,
      internalOrderType,
      internalOrderId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create checkout session.' },
      { status: 400 }
    )
  }
}

