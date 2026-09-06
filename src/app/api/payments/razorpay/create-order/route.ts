import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/payments/service'
import { rateLimitResponse, buildRateLimitKey, rateLimitCheck } from '@/lib/rate-limit'
import { verifyGuestOrderAccess } from '@/lib/shop/guest-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CreateOrderBody = {
  internalOrderType?: unknown
  internalOrderId?: unknown
  paymentPurpose?: unknown
  expectedAmountPaise?: unknown
  /** Meta pixel _fbp cookie value for CAPI match quality */
  fbp?: unknown
  /** Meta pixel _fbc cookie value for CAPI match quality */
  fbc?: unknown
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  // Guests may pay for their own shop order by presenting the guest access
  // token issued at checkout (header). Everything else requires a session.
  const guestToken = request.headers.get('x-guest-order-token')?.trim() || ''
  let userId: string | null = null

  if (!authError && authData.user) {
    userId = authData.user.id
  }

  try {
    const body = (await request.json()) as CreateOrderBody
    const internalOrderType = normalizeText(body.internalOrderType) as 'shop_order' | 'custom_quote'
    const internalOrderId = normalizeText(body.internalOrderId)
    const paymentPurpose = normalizeText(body.paymentPurpose) as 'shop_order' | 'custom_quote_full_payment' | 'custom_quote_deposit' | 'custom_quote_balance'
    const expectedAmountPaise = Number(body.expectedAmountPaise)
    // Meta pixel browser identifiers — optional, used to improve CAPI match quality
    const fbp = typeof body.fbp === 'string' && body.fbp ? body.fbp : undefined
    const fbc = typeof body.fbc === 'string' && body.fbc ? body.fbc : undefined

    if (!internalOrderType || !internalOrderId) {
      return NextResponse.json({ error: 'Order details are required.' }, { status: 400 })
    }

    if (!['shop_order', 'custom_quote'].includes(internalOrderType)) {
      return NextResponse.json({ error: 'Unsupported payment target.' }, { status: 400 })
    }

    if (!userId) {
      if (internalOrderType !== 'shop_order' || !guestToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const access = await verifyGuestOrderAccess(internalOrderId, guestToken)
      if (!access) {
        // 404 (not 403) so probing order ids reveals nothing.
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
      }
    }

    const rateLimitOptions = {
      prefix: 'razorpay_create_order',
      windowSeconds: 60,
      maxRequests: 10,
      ...(userId ? { userId } : {}),
    }
    const rateLimit = userId
      ? await rateLimitResponse(request, rateLimitOptions)
      : await rateLimitCheck(buildRateLimitKey(request, 'razorpay_create_order'), 60, 10)
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const result = await createCheckoutSession({
      type: internalOrderType,
      id: internalOrderId,
      ...(userId ? { customerId: userId } : {}),
      paymentPurpose: paymentPurpose || undefined,
      ...(Number.isFinite(expectedAmountPaise) && expectedAmountPaise > 0 ? { expectedAmountPaise } : {}),
      fbp,
      fbc,
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
