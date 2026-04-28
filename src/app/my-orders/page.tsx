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
  status: OrderStatus
  total_price: number
  delivery_charge: number
  created_at: string
  material: string
  color: string
  full_name: string
  city: string
  state: string
  pincode: string
}

export default async function MyOrdersPage() {
  const auth = await requireUser('/my-orders')
  const supabase = await createServerSupabaseClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, total_price, delivery_charge, created_at, material, color, full_name, city, state, pincode'
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  const ordersTableUnavailable = isMissingSupabaseTableError(error, 'orders')

  if (error && !ordersTableUnavailable) {
    throw new Error(error.message)
  }

  const rows = (orders ?? []) as OrderRow[]

  return (
    <div className="min-h-screen bg-[#050810] px-4 pb-16 pt-28 text-white md:px-8">
      <Navbar transparent />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-[rgba(9,14,25,0.82)] p-6 backdrop-blur-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#ffb493]">
            Order Requests
          </div>
          <h1 className="mt-5 font-[var(--font-syne)] text-4xl font-extrabold text-white">
            My Orders
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ea6c4]">
            Track every print request, current status, and pricing snapshot from one authenticated workspace.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
            <div className="text-xl font-medium text-white">
              {ordersTableUnavailable ? 'Orders unavailable' : 'No print requests yet.'}
            </div>
            <p className="mt-3 text-sm leading-7 text-[#9ea6c4]">
              {ordersTableUnavailable
                ? ORDERS_TABLE_UNAVAILABLE_MESSAGE
                : 'Create an instant quote and submit your first print request to start tracking it here.'}
            </p>
            <Link
              href="/instant-quote"
              className="mt-6 inline-flex rounded-2xl bg-[#FF5C1A] px-5 py-3 text-sm font-medium text-white"
            >
              Create a print request
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {rows.map((order) => (
              <Link
                key={order.id}
                href={`/my-orders/${order.id}`}
                className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-colors hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">
                      Order ID
                    </div>
                    <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold text-white">
                      {order.order_number ?? order.id}
                    </div>
                  </div>
                  <div
                    className={`rounded-full border px-3 py-1 text-xs ${getOrderStatusClasses(order.status)}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                      Total price
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      ₹{Number(order.total_price).toFixed(0)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                      Date
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                      Delivery
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {Number(order.delivery_charge) === 0
                        ? 'Free delivery'
                        : `₹${Number(order.delivery_charge).toFixed(0)}`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                      Material
                    </div>
                    <div className="mt-2 text-sm text-white">{order.material}</div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                      Recipient
                    </div>
                    <div className="mt-2 text-sm text-white">{order.full_name}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                      Address
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {order.city}, {order.state} {order.pincode}
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
