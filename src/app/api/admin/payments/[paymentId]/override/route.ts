import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { fetchPaymentAttemptById } from '@/lib/payments/repository'
import { updateOrderPaymentStatus } from '@/lib/payments/state'
import { assertPaymentStatusTransition } from '@/lib/payments/logic'
import type { PaymentStatus } from '@/lib/payments/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireAdminPermission('payments.override')
  if ('response' in auth) return auth.response

  try {
    const { paymentId } = await params
    const body = await request.json().catch(() => ({})) as {
      newStatus?: unknown
      reason?: unknown
      internalOrderType?: unknown
      internalOrderId?: unknown
    }

    const newStatus = typeof body.newStatus === 'string' ? (body.newStatus as PaymentStatus) : null
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const internalOrderType = typeof body.internalOrderType === 'string' ? body.internalOrderType : ''
    const internalOrderId = typeof body.internalOrderId === 'string' ? body.internalOrderId : ''

    if (!newStatus || !reason) {
      return NextResponse.json({ error: 'New status and reason are required.' }, { status: 400 })
    }

    if (!internalOrderType || !internalOrderId) {
      return NextResponse.json({ error: 'Internal order reference is required.' }, { status: 400 })
    }

    if (newStatus !== 'paid' && newStatus !== 'failed' && newStatus !== 'cancelled') {
      return NextResponse.json({ error: 'Manual override status is not allowed.' }, { status: 400 })
    }

    const attempt = await fetchPaymentAttemptById(paymentId)
    if (!attempt) {
      return NextResponse.json({ error: 'Payment attempt not found.' }, { status: 404 })
    }

    assertPaymentStatusTransition(attempt.status, newStatus)

    await updateOrderPaymentStatus({
      type: internalOrderType as 'shop_order' | 'custom_quote',
      id: internalOrderId,
      currentStatus: attempt.status,
      nextStatus: newStatus,
      patch: {
        payment_attempt_id: attempt.id,
        provider_order_id: attempt.provider_order_id,
        provider_payment_id: attempt.provider_payment_id,
        payment_verified_at: newStatus === 'paid' ? new Date().toISOString() : null,
      },
      reason: {
        actorId: auth.user.id,
        actorRole: 'finance',
        reason,
        approvedByAdminId: auth.user.id,
      },
    })

    // Convert inventory reservations if payment was successful for a shop order
    if (newStatus === 'paid' && internalOrderType === 'shop_order') {
      try {
        const adminSupabase = createAdminSupabaseClient()
        await adminSupabase.rpc('convert_inventory_reservations', { p_order_id: internalOrderId })
      } catch {
        console.error('[override] Failed to convert reservations')
      }
    }

    return NextResponse.json({ success: true, paymentId, newStatus })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
