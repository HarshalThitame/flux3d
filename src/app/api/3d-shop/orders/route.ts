import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { mapShopOrderRow, shopOrderStatuses, type ShopOrderStatus } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

function parsePositiveInteger(value: string | null, fallback: number, max?: number) {
  const next = Number(value)
  if (!Number.isInteger(next) || next <= 0) return fallback
  return max ? Math.min(next, max) : next
}

export async function GET(request: Request) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parsePositiveInteger(searchParams.get('page'), 1)
    const limit = parsePositiveInteger(searchParams.get('limit'), 10, 50)
    const from = (page - 1) * limit
    const to = from + limit - 1
    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('shelf_orders')
      .select('*', { count: 'exact' })
      .eq('user_id', authData.user.id)
      .order('placed_at', { ascending: false })
      .range(from, to)

    if (status && shopOrderStatuses.includes(status as ShopOrderStatus)) {
      query = query.eq('order_status', status)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({
      orders: (data ?? []).map((row) => mapShopOrderRow(row)),
      page,
      limit,
      total: count ?? 0,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load orders.' },
      { status: 500 }
    )
  }
}
