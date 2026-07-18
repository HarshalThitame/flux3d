import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPaymentStatusForOrder } from '@/lib/payments/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizeText(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ internalOrderType: string; orderId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resolved = await params
    const internalOrderType = normalizeText(resolved.internalOrderType) as 'shop_order' | 'custom_quote'
    const orderId = normalizeText(resolved.orderId)

    if (!['shop_order', 'custom_quote'].includes(internalOrderType) || !orderId) {
      return NextResponse.json({ error: 'Invalid order.' }, { status: 400 })
    }

    const result = await getPaymentStatusForOrder({
      type: internalOrderType,
      id: orderId,
      customerId: authData.user.id,
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

