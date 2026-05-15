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
    <div className="min-h-screen bg-[#FFFFFF] px-4 pb-16 pt-28 text-[#0F1B3D] md:px-8">
      <Navbar transparent />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[32px] border border-[#7C5CFF]/10 bg-[rgba(255,255,255,0.96)] p-6 backdrop-blur-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#7C5CFF]">
            Order Requests
          </div>
          <h1 className="mt-5 font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D]">
            My Orders
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#6F7192]">
            Track every print request, current status, and pricing snapshot from one authenticated workspace.
          </p>
        </div>

        {groupedOrders.length === 0 ? (
          <div className="rounded-[28px] border border-[#7C5CFF]/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
            <div className="text-xl font-medium text-[#0F1B3D]">
              {ordersTableUnavailable ? 'Orders unavailable' : 'No print requests yet.'}
            </div>
            <p className="mt-3 text-sm leading-7 text-[#6F7192]">
              {ordersTableUnavailable
                ? ORDERS_TABLE_UNAVAILABLE_MESSAGE
                : 'Create an instant quote and submit your first print request to start tracking it here.'}
            </p>
            <Link
              href="/instant-quote"
              className="mt-6 inline-flex rounded-2xl bg-[#7C5CFF] px-5 py-3 text-sm font-medium text-white"
            >
              Create a print request
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedOrders.map((order) => (
              <Link
                key={order.groupId}
                href={`/my-orders/${order.items[0].id}`}
                className="block rounded-[28px] border border-[#7C5CFF]/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-colors hover:border-[#7C5CFF]/10"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-start gap-5">
                    <div className="rounded-2xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 p-3 text-[#7C5CFF]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">
                          {order.orderNumber}
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-xs ${getOrderStatusClasses(order.status)}`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-[#6F7192]">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>

                      {order.itemCount > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {order.items.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-1.5 text-xs text-[#6F7192]"
                            >
                              {item.material} · {item.color}
                            </span>
                          ))}
                        </div>
                      )}

                      {order.itemCount === 1 && (
                        <div className="mt-2 text-sm text-[#0F1B3D]">{order.items[0].material} · {order.items[0].color}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-8 border-t border-[#7C5CFF]/10 pt-4 lg:border-t-0 lg:pt-0">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Total</div>
                      <div className="mt-1 font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">
                        ₹{order.grandTotal.toFixed(0)}
                      </div>
                      {order.cartDiscountAmount > 0 && (
                        <div className="mt-1 text-[10px] text-emerald-700">
                          Saved ₹{order.cartDiscountAmount.toFixed(0)}
                          {order.discountLabel ? ` · ${order.discountLabel}` : ''}
                        </div>
                      )}
                      {order.cartDiscountAmount === 0 && order.discountLabel && (
                        <div className="mt-1 text-[10px] text-[#6F7192]">
                          {order.discountLabel}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Items</div>
                      <div className="mt-1 font-[var(--font-syne)] text-xl font-bold text-[#7C5CFF]">
                        {order.itemCount}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Delivery</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">
                        {order.deliveryCharge === 0 ? 'Free' : `₹${order.deliveryCharge.toFixed(0)}`}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Saved</div>
                      <div className="mt-1 text-sm font-medium text-emerald-700">
                        {order.cartDiscountAmount > 0 ? `₹${order.cartDiscountAmount.toFixed(0)}` : '₹0'}
                      </div>
                    </div>
                    <div className="hidden text-left sm:block">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Ship to</div>
                      <div className="mt-1 text-sm text-[#0F1B3D]">{order.city}, {order.state}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
