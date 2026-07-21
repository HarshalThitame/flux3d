import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSettings } from '@/lib/settings'
import { initiateRefund } from '@/lib/payments/service'
import { insertPaymentRefund } from '@/lib/payments/repository'

type Body = {
  amountPaise?: unknown
  reason?: unknown
  speed?: unknown
  skipApproval?: boolean
}

const LARGE_REFUND_THRESHOLD_PAISE = 5_000_000 // ₹50,000
const APPROVAL_THRESHOLD_PAISE = 500_000 // ₹5,000 — refunds at or above this require second-person approval

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireAdminPermission('refunds.create')
  if ('response' in auth) return auth.response

  try {
    const { paymentId } = await params
    const body = await request.json().catch(() => ({})) as Body
    const amountPaise = Math.max(0, Math.round(Number(body.amountPaise ?? 0)))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const speed = body.speed === 'optimum' ? 'optimum' : 'normal'
    const skipApproval = body.skipApproval === true

    if (!amountPaise || !reason) {
      return NextResponse.json({ error: 'Amount and reason are required.' }, { status: 400 })
    }

    if (amountPaise >= LARGE_REFUND_THRESHOLD_PAISE && !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Refunds above ₹50,000 require super-admin approval.' },
        { status: 403 }
      )
    }

    // Approval workflow: amounts at or above threshold require second-person approval
    const refundSettings = await getSettings().catch(() => null)
    const permissionMode = refundSettings?.razorpayRefundPermissionMode || 'admin'
    const approvalRequired = permissionMode === 'admin' || (permissionMode === 'super_admin' && !auth.isAdmin)
    const needsApproval = approvalRequired && amountPaise >= APPROVAL_THRESHOLD_PAISE && !skipApproval && !auth.isAdmin

    if (needsApproval) {
      const { fetchPaymentAttemptById } = await import('@/lib/payments/repository')
      const attempt = await fetchPaymentAttemptById(paymentId)
      if (!attempt) return NextResponse.json({ error: 'Payment attempt not found.' }, { status: 404 })
      if (!['paid', 'captured', 'partially_refunded'].includes(attempt.status)) {
        return NextResponse.json({ error: 'Only captured payments can be refunded.' }, { status: 400 })
      }

      // Create refund with pending_approval status — no Razorpay call yet
      const refundRow = await insertPaymentRefund({
        payment_attempt_id: attempt.id,
        provider_refund_id: null,
        amount_paise: amountPaise,
        status: 'pending_approval',
        reason,
        speed: speed === 'optimum' ? 'optimum' : null,
        initiated_by_admin_id: auth.user.id,
        provider_response: {},
        processed_at: null,
        failed_at: null,
      })

      // Create approval record
      const adminSupabase = createAdminSupabaseClient()
      await adminSupabase.from('refund_approvals').insert({
        refund_id: refundRow.id,
        initiated_by_admin_id: auth.user.id,
        status: 'pending',
        threshold_paise: APPROVAL_THRESHOLD_PAISE,
      })

      return NextResponse.json({
        refund: refundRow,
        approvalRequired: true,
        approvalThreshold: APPROVAL_THRESHOLD_PAISE,
      })
    }

    // Below threshold: proceed directly to Razorpay
    const result = await initiateRefund({
      paymentAttemptId: paymentId,
      amountPaise,
      reason,
      speed,
      initiatedByAdminId: auth.user.id,
    })

    return NextResponse.json({
      refund: result.refund,
      providerResponse: result.providerResponse,
      approvalRequired: false,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
