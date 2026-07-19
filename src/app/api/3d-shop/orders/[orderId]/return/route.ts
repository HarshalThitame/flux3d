import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isShopOrderReturnable } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

type ReturnBody = {
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
    const body = (await request.json().catch(() => ({}))) as ReturnBody
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return NextResponse.json({ error: 'Return reason is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { data: order, error: loadError } = await supabase
      .from('shelf_orders')
      .select('id, user_id, fulfilment_status, placed_at')
      .eq('id', orderId)
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (loadError) throw new Error(loadError.message)
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (order.fulfilment_status !== 'delivered') {
      return NextResponse.json({ error: 'Only delivered orders can be returned.' }, { status: 400 })
    }
    if (!isShopOrderReturnable(order.fulfilment_status, order.placed_at)) {
      return NextResponse.json({ error: 'Return window has expired.' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('shelf_orders')
      .update({ order_status: 'return_requested', cancellation_reason: reason })
      .eq('id', orderId)
      .eq('user_id', authData.user.id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request return.' },
      { status: 500 }
    )
  }
}
