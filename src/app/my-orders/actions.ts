'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const cancelableStatuses = ['pending', 'reviewed', 'approved', 'queued']

export async function cancelOrderAction(orderId: string) {
  const auth = await requireUser(`/my-orders/${orderId}`)
  const supabase = await createServerSupabaseClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, group_id')
    .eq('id', orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error || !order) {
    throw new Error('Order not found.')
  }

  if (!cancelableStatuses.includes(order.status)) {
    throw new Error('This order cannot be cancelled at its current status.')
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', orderId)
    .eq('user_id', auth.user.id)

  if (updateError) {
    throw new Error('Failed to cancel order.')
  }

  if (order.group_id) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: now })
      .eq('group_id', order.group_id)
      .eq('user_id', auth.user.id)
      .in('status', cancelableStatuses)
  }

  revalidatePath(`/my-orders/${orderId}`)
  revalidatePath('/my-orders')
  redirect(`/my-orders/${orderId}`)
}
