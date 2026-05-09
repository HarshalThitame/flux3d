import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const cancelableStatuses = ['pending', 'reviewed', 'approved', 'queued']

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    const supabase = await createServerSupabaseClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = userData.user

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, group_id')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (!cancelableStatuses.includes(order.status)) {
      return NextResponse.json({ error: 'This order cannot be cancelled at its current status.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', orderId)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel order.' }, { status: 500 })
    }

    if (order.group_id) {
      await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: now })
        .eq('group_id', order.group_id)
        .eq('user_id', user.id)
        .in('status', cancelableStatuses)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Cancel order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
