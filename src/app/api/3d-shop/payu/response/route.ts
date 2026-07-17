import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { buildPayuResponseHash, getPayuConfig } from '@/lib/payu'
import { mapShopOrderRow } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

type PayuPayload = Record<string, string>

function readValue(value: FormDataEntryValue | null | undefined) {
  return typeof value === 'string' ? value : ''
}

async function parsePayload(request: Request): Promise<PayuPayload> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const payload: PayuPayload = {}
    for (const [key, value] of form.entries()) {
      payload[key] = readValue(value)
    }
    return payload
  }

  const url = new URL(request.url)
  const payload: PayuPayload = {}
  url.searchParams.forEach((value, key) => {
    payload[key] = value
  })
  return payload
}

function appendNote(existing: string | null | undefined, note: string) {
  return existing ? `${existing}\n${note}` : note
}

function toRedirectUrl(orderId: string | null, status: 'success' | 'failed', message?: string) {
  const target = orderId ? `/3d-shop/order/${encodeURIComponent(orderId)}?payment=${status}` : '/3d-shop/orders'
  const url = new URL(target, 'https://flux3d.in')
  if (message) url.searchParams.set('payment_message', message.slice(0, 160))
  return url
}

async function processResponse(request: Request) {
  const config = getPayuConfig()
  const payload = await parsePayload(request)

  if (!config) {
    return NextResponse.redirect(toRedirectUrl(payload.udf1 || null, 'failed', 'PayU is not configured.'))
  }

  const orderId = payload.udf1?.trim() || ''
  const txnid = payload.txnid?.trim() || ''
  const status = payload.status?.trim().toLowerCase() || ''
  const amount = payload.amount?.trim() || ''
  const productinfo = payload.productinfo?.trim() || ''
  const firstname = payload.firstname?.trim() || ''
  const email = payload.email?.trim() || ''
  const hash = payload.hash?.trim() || ''
  const additionalCharges = payload.additionalCharges?.trim() || ''

  if (!orderId || !txnid || !hash) {
    return NextResponse.redirect(toRedirectUrl(orderId || null, 'failed', 'Incomplete gateway response.'))
  }

  const supabase = createAdminSupabaseClient()
  const { data: row, error } = await supabase
    .from('shelf_orders')
    .select('*')
    .eq('id', orderId)
    .eq('order_number', txnid)
    .maybeSingle()

  if (error) {
    return NextResponse.redirect(toRedirectUrl(orderId, 'failed', 'Order not found.'))
  }

  if (!row) {
    return NextResponse.redirect(toRedirectUrl(orderId, 'failed', 'Order not found.'))
  }

  const order = mapShopOrderRow(row)
  const receivedAmount = Number(amount)
  const orderAmountMatches = Number.isFinite(receivedAmount) && Math.abs(receivedAmount - order.total_amount) <= 1
  const productMatches = productinfo === `Flux 3D Order ${order.order_number}`
  const expectedHash = buildPayuResponseHash({
    merchantKey: config.merchantKey,
    txnid: order.order_number,
    amount,
    productinfo,
    firstname,
    email,
    additionalCharges,
    udf1: payload.udf1 || '',
    udf2: payload.udf2 || '',
    udf3: payload.udf3 || '',
    udf4: payload.udf4 || '',
    udf5: payload.udf5 || '',
    status,
    salt: config.salt,
  })

  const hashMatches = expectedHash.toLowerCase() === hash.toLowerCase()
  const paymentRef = payload.mihpayid?.trim() || payload.bank_ref_num?.trim() || txnid
  const note = JSON.stringify({
    type: 'PAYU_RESPONSE',
    status,
    txnid,
    paymentRef,
    verified: hashMatches && orderAmountMatches && productMatches,
    receivedAt: new Date().toISOString(),
  })

  if (status === 'success' && hashMatches && orderAmountMatches && productMatches) {
    if (order.payment_status === 'paid' && order.payment_id === paymentRef) {
      return NextResponse.redirect(toRedirectUrl(order.id, 'success'))
    }

    const { error: updateError } = await supabase
      .from('shelf_orders')
      .update({
        payment_method: 'payu',
        payment_status: 'paid',
        payment_id: paymentRef,
        admin_notes: appendNote(order.admin_notes, note),
      })
      .eq('id', order.id)

    if (updateError) {
      return NextResponse.redirect(toRedirectUrl(order.id, 'failed', 'Could not update payment state.'))
    }

    return NextResponse.redirect(toRedirectUrl(order.id, 'success'))
  }

  const { error: updateError } = await supabase
    .from('shelf_orders')
    .update({
      payment_method: 'payu',
      payment_status: order.payment_status === 'paid' ? order.payment_status : 'failed',
      payment_id: order.payment_id,
      admin_notes: appendNote(order.admin_notes, note),
    })
    .eq('id', order.id)

  if (updateError) {
    return NextResponse.redirect(toRedirectUrl(order.id, 'failed', 'Could not update failed payment state.'))
  }

  const reason = !hashMatches
    ? 'Payment verification failed.'
    : !orderAmountMatches
      ? 'Payment amount mismatch.'
      : !productMatches
        ? 'Payment details did not match the order.'
        : 'Payment failed.'

  return NextResponse.redirect(toRedirectUrl(order.id, 'failed', reason))
}

export async function POST(request: Request) {
  return processResponse(request)
}

export async function GET(request: Request) {
  return processResponse(request)
}
