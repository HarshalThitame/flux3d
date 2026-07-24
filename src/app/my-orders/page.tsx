import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/auth/server'
import { getOrderStatusClasses, getOrderStatusLabel, type OrderStatus } from '@/lib/orders'
import {
  isMissingSupabaseTableError,
  ORDERS_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type OrderRow = {
  id: string
  order_number: string | null
  group_id: string | null
  status: OrderStatus
  material_cost: number
  machine_cost: number
  subtotal: number
  total_price: number
  final_price: number | null
  grand_total: number | null
  delivery_charge: number
  discount: number | null
  cart_discount: number | null
  cart_discount_percent: number | null
  overhead_percent: number | null
  overhead_amount: number | null
  margin_percent: number | null
  margin_amount: number | null
  coupon_code: string | null
  discount_type: string | null
  created_at: string
  material: string
  color: string
  full_name: string
  city: string
  state: string
  pincode: string
  file_url: string | null
  price: number
  estimated_time: number
}

type GroupedOrder = {
  groupId: string
  orderNumber: string
  status: OrderStatus
  totalPrice: number
  totalPriceBeforeDiscount: number
  finalPrice: number
  grandTotal: number
  subtotal: number
  materialCost: number
  machineCost: number
  deliveryCharge: number
  cartDiscountAmount: number
  cartDiscountPercent: number
  overheadPercent: number
  overheadAmount: number
  marginPercent: number
  marginAmount: number
  discountLabel: string | null
  createdAt: string
  fullName: string
  city: string
  state: string
  pincode: string
  itemCount: number
  items: {
    id: string
    material: string
    color: string
    price: number
    estimatedTime: number
    fileUrl: string | null
  }[]
}

export default async function MyOrdersPage() {
  const auth = await requireUser('/my-orders')
  const supabase = await createServerSupabaseClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, group_id, status, material_cost, machine_cost, subtotal, total_price, final_price, grand_total, delivery_charge, discount, cart_discount, cart_discount_percent, overhead_percent, overhead_amount, margin_percent, margin_amount, coupon_code, discount_type, created_at, material, color, full_name, city, state, pincode, file_url, price, estimated_time'
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  const ordersTableUnavailable = isMissingSupabaseTableError(error, 'orders')

  if (error && !ordersTableUnavailable) {
    throw new Error(error.message)
  }

  const rows = (orders ?? []) as OrderRow[]

  const groupedOrders = rows.reduce<GroupedOrder[]>((acc, row) => {
    const groupId = row.group_id ?? row.id

    const existing = acc.find((g) => g.groupId === groupId)
    if (existing) {
      existing.items.push({
        id: row.id,
        material: row.material,
        color: row.color,
        price: Number(row.price),
        estimatedTime: Number(row.estimated_time),
        fileUrl: row.file_url,
      })
      existing.totalPriceBeforeDiscount += Number(row.total_price)
      existing.finalPrice += Number(row.final_price ?? Number(row.total_price) - Number(row.cart_discount ?? 0))
      existing.grandTotal += Number(row.grand_total ?? Number(row.final_price ?? Number(row.total_price) - Number(row.cart_discount ?? 0)) + Number(row.delivery_charge))
      existing.totalPrice = existing.grandTotal
      existing.subtotal += Number(row.subtotal ?? row.price)
      existing.materialCost += Number(row.material_cost)
      existing.machineCost += Number(row.machine_cost)
      existing.deliveryCharge += Number(row.delivery_charge)
      existing.cartDiscountAmount += Number(row.cart_discount ?? 0)
      existing.overheadAmount += Number(row.overhead_amount ?? 0)
      existing.marginAmount += Number(row.margin_amount ?? 0)
      existing.itemCount += 1
    } else {
      acc.push({
        groupId,
        orderNumber: row.order_number ?? row.id,
        status: row.status,
        totalPrice: Number(row.grand_total ?? Number(row.final_price ?? Number(row.total_price) - Number(row.cart_discount ?? 0)) + Number(row.delivery_charge)),
        totalPriceBeforeDiscount: Number(row.total_price),
        finalPrice: Number(row.final_price ?? Number(row.total_price) - Number(row.cart_discount ?? 0)),
        grandTotal: Number(row.grand_total ?? Number(row.final_price ?? Number(row.total_price) - Number(row.cart_discount ?? 0)) + Number(row.delivery_charge)),
        subtotal: Number(row.subtotal ?? row.price),
        materialCost: Number(row.material_cost),
        machineCost: Number(row.machine_cost),
        deliveryCharge: Number(row.delivery_charge),
        cartDiscountAmount: Number(row.cart_discount ?? 0),
        cartDiscountPercent: Number(row.cart_discount_percent ?? 0),
        overheadPercent: Number(row.overhead_percent ?? 0),
        overheadAmount: Number(row.overhead_amount ?? 0),
        marginPercent: Number(row.margin_percent ?? 0),
        marginAmount: Number(row.margin_amount ?? 0),
        discountLabel:
          Number(row.cart_discount ?? 0) > 0
            ? row.cart_discount_percent
              ? `Cart discount ${Number(row.cart_discount_percent)}%`
              : 'Cart discount applied'
            : row.coupon_code ?? (Number(row.discount ?? 0) > 0 ? 'Applied discount' : null),
        createdAt: row.created_at,
        fullName: row.full_name,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        itemCount: 1,
        items: [{
          id: row.id,
          material: row.material,
          color: row.color,
          price: Number(row.price),
          estimatedTime: Number(row.estimated_time),
          fileUrl: row.file_url,
        }],
      })
    }

    return acc
  }, [])

  return (
    <div className="min-h-screen bg-[#f9f7f4] text-[#0F1B3D]">
      <Navbar transparent />
      <main className="px-4 pb-24 pt-6 md:px-6 md:pt-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-[#6d28d9]">
                My Orders
              </div>
              <h1 className="mt-1 text-2xl font-bold text-[#0F1B3D] md:text-3xl">
                Order Requests
              </h1>
            </div>
            <Link
              href="/3d-shop/orders"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#6d28d9]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#6d28d9] shadow-sm transition hover:bg-[#6d28d9]/5"
            >
              <span>3D Shop</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {groupedOrders.length === 0 ? (
            <div className="order-section text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9]/10">
                <svg className="h-6 w-6 text-[#6d28d9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <div className="mt-3 text-base font-semibold text-[#0F1B3D]">
                {ordersTableUnavailable ? 'Orders unavailable' : 'No print requests yet'}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {ordersTableUnavailable
                  ? ORDERS_TABLE_UNAVAILABLE_MESSAGE
                  : 'Create an instant quote and submit your first print request to start tracking it here.'}
              </p>
              <Link
                href="/instant-quote"
                className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#6d28d9]/20 transition hover:shadow-lg hover:shadow-[#6d28d9]/30"
              >
                Create a print request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedOrders.map((order, index) => {
                const statusClass = getOrderStatusClasses(order.status)
                const statusLabel = getOrderStatusLabel(order.status)
                const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })

                return (
                  <Link
                    key={order.groupId}
                    href={`/my-orders/${order.items[0].id}`}
                    className={`order-list-card status-${order.status} animate-slide-in-up`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0F1B3D] truncate text-sm">
                            {order.orderNumber}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                          <time>{date}</time>
                          <span className="text-gray-300">·</span>
                          <span>{order.items[0].material} · {order.items[0].color}</span>
                        </div>

                        {order.itemCount > 1 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {order.items.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600"
                              >
                                {item.material}
                              </span>
                            ))}
                            {order.items.length > 3 && (
                              <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                                +{order.items.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#6d28d9]">
                            ₹{order.grandTotal.toFixed(0)}
                          </div>
                          {order.cartDiscountAmount > 0 && (
                            <div className="text-[10px] text-emerald-600">
                              Saved ₹{order.cartDiscountAmount.toFixed(0)}
                            </div>
                          )}
                        </div>
                        <div className="rounded-full bg-[#6d28d9]/10 px-2 py-0.5 text-[10px] font-medium text-[#6d28d9]">
                          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
