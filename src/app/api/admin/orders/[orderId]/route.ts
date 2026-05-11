import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { groupAdminOrders } from '@/lib/admin/queries'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { loadOrderDiscountSummary } from '@/lib/order-discounts'
import { requireAdminRequest } from '@/lib/admin/request'
import type { OrderStatus } from '@/lib/orders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AdminOrderRow = {
  id: string | number
  order_number: string | null
  group_id: string | null
  file_url?: string | null
  material: string | null
  color?: string | null
  infill?: number | null
  layer_height?: number | null
  price?: number | string | null
  price_per_unit?: number | string | null
  total_price: number | string | null
  quantity?: number | null
  estimated_time?: number | null
  supports?: boolean | null
  post_processing_level?: string | null
  post_processing_charges?: number | string | null
  status: OrderStatus
  created_at: string | null
  notes: string | null
  full_name: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  landmark?: string | null
  delivery_charge?: number | string | null
  discount?: number | string | null
  coupon_code?: string | null
  coupon_id?: string | null
  discount_type?: string | null
}

type DiscountLookupRow = {
  id: string
  order_number: string | null
  discount?: number | string | null
  coupon_code?: string | null
  coupon_id?: string | null
  discount_type?: string | null
}

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

    const grouped = groupAdminOrders(rows as AdminOrderRow[])
    const discountRows: DiscountLookupRow[] = rows.map((row) => ({
      id: String(row.id),
      order_number: row.order_number ?? null,
      discount: row.discount ?? null,
      coupon_code: row.coupon_code ?? null,
      coupon_id: row.coupon_id ?? null,
      discount_type: row.discount_type ?? null,
    }))
    const discountSummary = await (loadOrderDiscountSummary as any)(supabase, discountRows)

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
