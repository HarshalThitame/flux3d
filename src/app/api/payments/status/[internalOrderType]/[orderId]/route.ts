import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPaymentStatusForOrder } from '@/lib/payments/service'
import { verifyGuestOrderAccess } from '@/lib/shop/guest-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizeText(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ internalOrderType: string; orderId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  let userId: string | null = null
  if (!authError && authData.user) {
    userId = authData.user.id
  }

  try {
    const resolved = await params
    const internalOrderType = normalizeText(resolved.internalOrderType) as 'shop_order' | 'custom_quote'
    const orderId = normalizeText(resolved.orderId)

    if (!['shop_order', 'custom_quote'].includes(internalOrderType) || !orderId) {
      return NextResponse.json({ error: 'Invalid order.' }, { status: 400 })
    }

    // Guest polling: token comes as ?token= (EventSource-friendly) or header.
    let guestToken = request.headers.get('x-guest-order-token')?.trim() || ''
    if (!guestToken) {
      const url = new URL(request.url)
      guestToken = url.searchParams.get('token')?.trim() || ''
    }

    if (!userId) {
      if (internalOrderType !== 'shop_order' || !guestToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const access = await verifyGuestOrderAccess(orderId, guestToken)
      if (!access) {
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
      }
    }

    const result = await getPaymentStatusForOrder({
      type: internalOrderType,
      id: orderId,
      ...(userId ? { customerId: userId } : {}),
    })

    return NextResponse.json({
      orderId,
      internalOrderType,
      paymentStatus: result.paymentAttempt?.status ?? result.order.payment_status ?? 'pending',
      providerOrderId: result.paymentAttempt?.provider_order_id ?? result.order.provider_order_id ?? null,
      providerPaymentId: result.paymentAttempt?.provider_payment_id ?? result.order.provider_payment_id ?? null,
      paymentPurpose: result.paymentAttempt?.payment_purpose ?? result.order.payment_purpose ?? null,
      amountPaise: result.paymentAttempt?.amount_paise ?? Number(result.order.payment_amount_paise ?? 0),
      currency: result.paymentAttempt?.currency ?? result.order.payment_currency ?? 'INR',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load payment status.' },
      { status: 400 }
    )
  }
}
