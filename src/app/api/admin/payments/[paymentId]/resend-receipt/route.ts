import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { requireAdminPermission } from '@/lib/admin/permissions'
import {
  fetchPaymentAttemptById,
  fetchPaymentAttemptByProviderOrderId,
} from '@/lib/payments/repository'
import { notifyPaymentCaptured } from '@/lib/payments/email-triggers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Re-send the payment receipt / order-placed emails for an attempt.
 *
 * Idempotent: the underlying email triggers de-duplicate on email_logs
 * (order id + type + sent/delivered status), so repeated clicks and
 * webhook-vs-verify double fires never produce duplicate receipts.
 * Used operationally to recover receipts for guest orders placed before
 * the guest-email fix was deployed.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireAdminPermission('payments.view')
  if ('response' in auth) return auth.response

  try {
    const { paymentId } = await params

    // Attempts can be addressed by internal id or provider order id.
    const attempt =
      (await fetchPaymentAttemptById(paymentId)) ??
      (await fetchPaymentAttemptByProviderOrderId(paymentId))

    if (!attempt) {
      return NextResponse.json({ error: 'Payment attempt not found.' }, { status: 404 })
    }

    if (attempt.status !== 'paid' && attempt.status !== 'captured') {
      return NextResponse.json(
        { error: `Receipts are only sent for paid attempts (current status: ${attempt.status}).` },
        { status: 400 }
      )
    }

    await notifyPaymentCaptured(attempt)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'resend_payment_receipt',
      target_type: 'payment',
      target_id: attempt.id,
      new_value: {
        internal_order_type: attempt.internal_order_type,
        internal_order_id: attempt.internal_order_id,
        customer_id: attempt.customer_id,
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
