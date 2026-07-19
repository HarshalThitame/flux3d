import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isShopOrderCancellable } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

type CancelBody = {
  reason?: unknown
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { orderId } = await context.params
    const body = (await request.json().catch(() => ({}))) as CancelBody
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return NextResponse.json({ error: 'Cancellation reason is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { data: order, error: loadError } = await supabase
      .from('shelf_orders')
      .select('id, user_id, order_status')
      .eq('id', orderId)
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (loadError) throw new Error(loadError.message)
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (!isShopOrderCancellable(order.order_status)) {
      return NextResponse.json({ error: 'Order cannot be cancelled at this stage.' }, { status: 400 })
    }

    const { error: cancelError } = await supabase.rpc('cancel_shelf_order', {
      p_order_id: orderId,
      p_reason: reason,
    })

    if (cancelError) throw new Error(cancelError.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel order.' },
      { status: 500 }
    )
  }
}
