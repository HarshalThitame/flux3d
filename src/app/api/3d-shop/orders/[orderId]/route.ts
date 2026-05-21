import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { mapShopOrderRow } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { orderId } = await context.params
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    return NextResponse.json({ order: mapShopOrderRow(data) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load order.' },
      { status: 500 }
    )
  }
}
