import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { groupAdminOrders } from '@/lib/admin/queries'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { loadOrderDiscountSummary } from '@/lib/order-discounts'
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
    const selectColumns =
      'id, order_number, group_id, file_url, material, color, infill, layer_height, quantity, price, price_per_unit, post_processing_charges, total_price, estimated_time, supports, post_processing_level, status, created_at, notes, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, discount, coupon_code, coupon_id, discount_type'

    const { data: groupedRows, error: groupedError } = await supabase
      .from('orders')
      .select(selectColumns)
      .eq('group_id', orderId)
      .order('created_at', { ascending: true })

    if (groupedError) throw new Error(groupedError.message)

    let rows = groupedRows ?? []

    if (rows.length === 0) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(selectColumns)
        .eq('id', orderId)
        .maybeSingle()

      if (orderError) throw new Error(orderError.message)

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      if (order.group_id) {
        const { data: orderGroupRows, error: orderGroupError } = await supabase
          .from('orders')
          .select(selectColumns)
          .eq('group_id', order.group_id)
          .order('created_at', { ascending: true })

        if (orderGroupError) throw new Error(orderGroupError.message)

        rows = orderGroupRows?.length ? orderGroupRows : [order]
      } else {
        rows = [order]
      }
    }

    const grouped = groupAdminOrders(rows as Parameters<typeof groupAdminOrders>[0])
    const discountSummary = await loadOrderDiscountSummary(supabase, rows as Array<{
      id: string
      order_number: string | null
      discount?: number | string | null
      coupon_code?: string | null
      coupon_id?: string | null
      discount_type?: string | null
    }>)

    return NextResponse.json({
      order: {
        ...grouped[0],
        discountAmount: discountSummary.amount,
        discountLabel: discountSummary.label,
        discountType: discountSummary.type,
        couponCode: discountSummary.couponCode,
        offerName: discountSummary.offerName,
        discountSource: discountSummary.source,
      },
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
