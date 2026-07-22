import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { fetchPaymentAttemptById, insertPaymentAuditLog, updatePaymentRefund } from '@/lib/payments/repository'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('refunds.approve')
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({})) as { reason?: string }
    const rejectionReason = typeof body.reason === 'string' ? body.reason.trim() : ''

    const supabase = createAdminSupabaseClient()

    const { data: refund } = await supabase
      .from('payment_refunds')
      .select('*')
      .eq('id', id)
      .single()

    if (!refund) return NextResponse.json({ error: 'Refund not found.' }, { status: 404 })
    if (refund.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Refund is not pending approval.' }, { status: 400 })
    }

    const { data: approval } = await supabase
      .from('refund_approvals')
      .select('*')
      .eq('refund_id', id)
      .eq('status', 'pending')
      .single()

    if (!approval) return NextResponse.json({ error: 'Approval record not found.' }, { status: 404 })

    // Fetch the payment attempt to determine which order to update
    const attempt = await fetchPaymentAttemptById(refund.payment_attempt_id)
    if (attempt) {
      const table = attempt.internal_order_type === 'shop_order' ? 'shelf_orders' : 'orders'
      const { error: orderError } = await supabase
        .from(table)
        .update({ payment_refund_status: 'none', updated_at: new Date().toISOString() })
        .eq('id', attempt.internal_order_id)

      if (orderError) {
        throw new Error(`Failed to reset order refund status: ${orderError.message}`)
      }
    }

    // Cancel the refund — no Razorpay call
    await updatePaymentRefund(id, {
      status: 'cancelled',
    })

    // Mark approval as rejected
    await supabase
      .from('refund_approvals')
      .update({
        status: 'rejected',
        approved_by_admin_id: auth.user.id,
        rejection_reason: rejectionReason,
        decided_at: new Date().toISOString(),
      })
      .eq('id', approval.id)

    await insertPaymentAuditLog({
      actor_id: auth.user.id,
      actor_role: 'admin',
      action: 'refund_rejected',
      entity_type: 'payment_refund',
      entity_id: id,
      new_state: { rejected: true, reason: rejectionReason, order_refund_reset: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
