import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendPaymentReceipt, sendPaymentFailed, sendRefundIssued } from '@/lib/email/triggers'

/**
 * Payment lifecycle email triggers.
 *
 * These are fire-and-forget: they never throw back into the webhook handler,
 * ensuring that payment state updates are never blocked by email queue issues.
 */

export async function notifyPaymentCaptured(
  attempt: {
    id: string
    customer_id: string
    internal_order_type: 'shop_order' | 'custom_quote_full_payment' | 'custom_quote_deposit' | 'custom_quote_balance'
    internal_order_id: string
    amount_paise: number
    payment_method: string | null
  }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const table = attempt.internal_order_type === 'shop_order' ? 'shelf_orders' : 'orders'
    const { data: order } = await supabase
      .from(table)
      .select('order_number, full_name, email, user_id')
      .eq('id', attempt.internal_order_id)
      .maybeSingle()

    if (!order) return
    const row = order as Record<string, unknown>
    const email = String(row.email ?? '')
    const name = String(row.full_name ?? 'Customer')
    const userId = String(row.user_id ?? attempt.customer_id)
    const orderNumber = String(row.order_number ?? attempt.internal_order_id)
    const amount = `₹${(attempt.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    if (!email) return
    await sendPaymentReceipt(
      userId,
      email,
      orderNumber,
      name,
      amount,
      attempt.payment_method || 'Online',
    )
  } catch (err) {
    console.error('[payments/email] notifyPaymentCaptured failed:', err)
  }
}

export async function notifyPaymentFailed(
  attempt: {
    id: string
    customer_id: string
    internal_order_type: 'shop_order' | 'custom_quote_full_payment' | 'custom_quote_deposit' | 'custom_quote_balance'
    internal_order_id: string
    amount_paise: number
  }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const table = attempt.internal_order_type === 'shop_order' ? 'shelf_orders' : 'orders'
    const { data: order } = await supabase
      .from(table)
      .select('order_number, full_name, email, user_id')
      .eq('id', attempt.internal_order_id)
      .maybeSingle()

    if (!order) return
    const row = order as Record<string, unknown>
    const email = String(row.email ?? '')
    const name = String(row.full_name ?? 'Customer')
    const userId = String(row.user_id ?? attempt.customer_id)
    const orderNumber = String(row.order_number ?? attempt.internal_order_id)
    const amount = `₹${(attempt.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    const retryUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'}/orders/${attempt.internal_order_id}/retry`

    if (!email) return
    await sendPaymentFailed(userId, email, orderNumber, name, amount, retryUrl)
  } catch (err) {
    console.error('[payments/email] notifyPaymentFailed failed:', err)
  }
}

export async function notifyRefundProcessed(
  attempt: {
    id: string
    customer_id: string
    internal_order_type: 'shop_order' | 'custom_quote_full_payment' | 'custom_quote_deposit' | 'custom_quote_balance'
    internal_order_id: string
  },
  refundAmountPaise: number
) {
  try {
    const supabase = createAdminSupabaseClient()
    const table = attempt.internal_order_type === 'shop_order' ? 'shelf_orders' : 'orders'
    const { data: order } = await supabase
      .from(table)
      .select('order_number, full_name, email, user_id')
      .eq('id', attempt.internal_order_id)
      .maybeSingle()

    if (!order) return
    const row = order as Record<string, unknown>
    const email = String(row.email ?? '')
    const name = String(row.full_name ?? 'Customer')
    const userId = String(row.user_id ?? attempt.customer_id)
    const orderNumber = String(row.order_number ?? attempt.internal_order_id)
    const refundAmount = `₹${(refundAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    if (!email) return
    await sendRefundIssued(
      userId,
      email,
      orderNumber,
      name,
      refundAmount,
      'Razorpay (original payment method)',
      '5-7 business days',
    )
  } catch (err) {
    console.error('[payments/email] notifyRefundProcessed failed:', err)
  }
}
