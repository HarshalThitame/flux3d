import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('refunds.approve')
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
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

    // Call Razorpay to execute the refund
    const { initiateRefund } = await import('@/lib/payments/service')
    const result = await initiateRefund({
      paymentAttemptId: refund.payment_attempt_id,
      amountPaise: Number(refund.amount_paise),
      reason: refund.reason,
      speed: refund.speed as 'normal' | 'optimum' | undefined,
      initiatedByAdminId: auth.user.id,
    })

    // Mark approval as decided
    await supabase
      .from('refund_approvals')
      .update({ status: 'approved', approved_by_admin_id: auth.user.id, decided_at: new Date().toISOString() })
      .eq('id', approval.id)

    return NextResponse.json({
      success: true,
      refund: result.refund,
      providerResponse: result.providerResponse,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
