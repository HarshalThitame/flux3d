import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { groupAdminOrders } from '@/lib/admin/queries'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { orderId } = await params
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, order_number, group_id, file_url, material, color, infill, layer_height, quantity, price, total_price, estimated_time, weight, status, created_at, notes, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge'
      )
      .or(`id.eq.${orderId},group_id.eq.${orderId}`)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const grouped = groupAdminOrders(data as any[])
    return NextResponse.json({ order: grouped[0] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
