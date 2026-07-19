import { createAdminSupabaseClient } from '@/lib/admin/server'
import { assertPaymentStatusTransition } from '@/lib/payments/logic'
import type { InternalOrderType, PaymentStatus } from '@/lib/payments/types'

export type PaymentStatusUpdateReason = {
  actorId: string
  actorRole: 'system' | 'customer' | 'admin' | 'finance'
  reason: string
  approvedByAdminId?: string | null
}

export async function updatePaymentAttemptStatus(
  attemptId: string,
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
  patch: Record<string, unknown>,
  reason: PaymentStatusUpdateReason
) {
  if (currentStatus !== nextStatus) {
    assertPaymentStatusTransition(currentStatus, nextStatus)
  }

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .update({ ...patch, status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Payment attempt not found.')

  await recordPaymentStatusHistory({
    paymentAttemptId: attemptId,
    oldStatus: currentStatus,
    newStatus: nextStatus,
    actorId: reason.actorId,
    actorRole: reason.actorRole,
    reason: reason.reason,
    approvedByAdminId: reason.approvedByAdminId ?? null,
  })

  return data
}

export async function updateOrderPaymentStatus(
  params: {
    type: InternalOrderType
    id: string
    currentStatus: PaymentStatus
    nextStatus: PaymentStatus
    patch: Record<string, unknown>
    reason: PaymentStatusUpdateReason
  }
) {
  if (params.currentStatus !== params.nextStatus) {
    assertPaymentStatusTransition(params.currentStatus, params.nextStatus)
  }

  const supabase = createAdminSupabaseClient()
  const table = params.type === 'shop_order' ? 'shelf_orders' : 'orders'

  const { data, error } = await supabase
    .from(table)
    .update({ ...params.patch, payment_status: params.nextStatus, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)

  const attemptId = typeof params.patch.payment_attempt_id === 'string'
    ? params.patch.payment_attempt_id
    : null

  if (attemptId) {
    await recordPaymentStatusHistory({
      paymentAttemptId: attemptId,
      oldStatus: params.currentStatus,
      newStatus: params.nextStatus,
      actorId: params.reason.actorId,
      actorRole: params.reason.actorRole,
      reason: params.reason.reason,
      approvedByAdminId: params.reason.approvedByAdminId ?? null,
      internalOrderType: params.type,
      internalOrderId: params.id,
    })
  }

  return data
}

export async function recordPaymentStatusHistory(params: {
  paymentAttemptId: string
  oldStatus: PaymentStatus
  newStatus: PaymentStatus
  actorId: string
  actorRole: string
  reason: string
  approvedByAdminId?: string | null
  internalOrderType?: InternalOrderType
  internalOrderId?: string
}) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('payment_status_history').insert({
    payment_attempt_id: params.paymentAttemptId,
    old_status: params.oldStatus,
    new_status: params.newStatus,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    reason: params.reason.slice(0, 500),
    approved_by_admin_id: params.approvedByAdminId ?? null,
    internal_order_type: params.internalOrderType ?? null,
    internal_order_id: params.internalOrderId ?? null,
    created_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
}

export function isPaymentStatusEditableByAdmin(status: PaymentStatus): boolean {
  return status !== 'paid' && status !== 'refunded'
}
