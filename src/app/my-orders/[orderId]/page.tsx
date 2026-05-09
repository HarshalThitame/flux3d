import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/auth/server'
import {
  formatAddressSummary,
  getOrderStatusClasses,
  getOrderStatusLabel,
  type OrderStatus,
} from '@/lib/orders'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { cancelOrderAction } from '@/app/my-orders/actions'
import { DownloadInvoiceButton } from './DownloadInvoiceButton'

type OrderDetailRow = {
  id: string
  order_number: string | null
  group_id: string | null
  file_url: string
  material: string
  color: string
  infill: number
  layer_height: number
  supports: boolean
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  delivery_charge: number
  total_price: number
  price: number
  estimated_time: number
  status: OrderStatus
  notes: string | null
  created_at: string
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const auth = await requireUser(`/my-orders/${orderId}`)
  const supabase = await createServerSupabaseClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, group_id, file_url, material, color, infill, layer_height, supports, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, price, estimated_time, status, notes, created_at'
    )
    .eq('id', orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!order) {
    notFound()
  }

  const row = order as OrderDetailRow
  const addressLines = formatAddressSummary({
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 ?? '',
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    landmark: row.landmark ?? '',
  })

  let groupedItems: OrderDetailRow[] = [row]
  if (row.group_id) {
    const { data: groupData } = await supabase
      .from('orders')
      .select(
        'id, order_number, group_id, file_url, material, color, infill, layer_height, supports, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, price, estimated_time, status, notes, created_at'
      )
      .eq('group_id', row.group_id)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })

    if (groupData && groupData.length > 0) {
      groupedItems = groupData as OrderDetailRow[]
    }
  }

  const isMultiItem = groupedItems.length > 1

  return (
    <div className="min-h-screen bg-[#050810] px-4 pb-16 pt-28 text-white md:px-8">
      <Navbar transparent />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-[rgba(9,14,25,0.82)] p-6 backdrop-blur-2xl">
          <Link
            href="/my-orders"
            className="inline-flex text-sm text-[#9ea6c4] transition-colors hover:text-white"
          >
            Back to orders
          </Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">
                Order request
              </div>
              <h1 className="mt-3 font-[var(--font-syne)] text-4xl font-extrabold text-white">
                {row.order_number ?? row.id}
              </h1>
              {isMultiItem && (
                <div className="mt-2 text-sm text-[#7dd3fc]">
                  {groupedItems.length} items in this order
                </div>
              )}
              <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ea6c4]">
                Submitted on{' '}
                {new Date(row.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                . This request is inquiry-based and does not include payment.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div
                className={`inline-flex rounded-full border px-4 py-2 text-sm ${getOrderStatusClasses(row.status)}`}
              >
                {getOrderStatusLabel(row.status)}
              </div>
              <div className="flex gap-2">
                {['pending', 'reviewed', 'approved', 'queued'].includes(row.status) && (
                  <form action={cancelOrderAction.bind(null, orderId)}>
                    <button
                      type="submit"
                      className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-400/20"
                    >
                      Cancel Order
                    </button>
                  </form>
                )}
                {['shipped', 'completed'].includes(row.status) && (
                  <DownloadInvoiceButton orderId={orderId} />
                )}
              </div>
            </div>
          </div>
        </div>

        {isMultiItem && (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
              Order Items ({groupedItems.length})
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {groupedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-white/10 bg-[#0d1120] p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{item.material}</div>
                      <div className="mt-1 text-sm text-[#c8d0e9]">{item.color}</div>
                    </div>
                    <div className="font-[var(--font-syne)] text-xl font-bold text-[#FF9A72]">
                      ₹{Number(item.total_price).toFixed(0)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Infill</div>
                      <div className="mt-1 text-sm font-medium text-white">{item.infill}%</div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Layer</div>
                      <div className="mt-1 text-sm font-medium text-white">{Number(item.layer_height)} mm</div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Supports</div>
                      <div className="mt-1 text-sm font-medium text-white">{item.supports ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-[#7a82a0] break-all truncate">
                    File: {item.file_url}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          {!isMultiItem && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
                Configuration
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Material</div>
                  <div className="mt-2 text-sm text-white">{row.material}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Color</div>
                  <div className="mt-2 text-sm text-white">{row.color}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Infill</div>
                  <div className="mt-2 text-sm text-white">{row.infill}%</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Layer height</div>
                  <div className="mt-2 text-sm text-white">{Number(row.layer_height)} mm</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Supports</div>
                  <div className="mt-2 text-sm text-white">{row.supports ? 'Included' : 'Not required'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">File</div>
                  <div className="mt-2 break-all text-sm text-white">{row.file_url}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                  Notes
                </div>
                <div className="mt-2 text-sm leading-7 text-white">
                  {row.notes?.trim() ? row.notes : 'No extra instructions were provided.'}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
              {isMultiItem ? 'Order Total' : 'Estimate'}
            </h2>
            <div className="mt-5 rounded-[24px] border border-[#FF8A57]/20 bg-[linear-gradient(180deg,rgba(255,92,26,0.12),rgba(255,92,26,0.06))] p-5 shadow-[0_12px_48px_rgba(255,92,26,0.1)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#ffd3c1]">
                Total price
              </div>
              <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-white">
                ₹{Number(row.total_price).toFixed(0)}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#ffe0d4]">
                {!isMultiItem && (
                  <div className="flex justify-between">
                    <span>Print cost</span>
                    <span>₹{Number(row.price).toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery charge</span>
                  <span>
                    {Number(row.delivery_charge) === 0
                      ? 'FREE'
                      : `₹${Number(row.delivery_charge).toFixed(0)}`}
                  </span>
                </div>
                {!isMultiItem && (
                  <div className="flex justify-between">
                    <span>Estimated print time</span>
                    <span>{Number(row.estimated_time).toFixed(1)} hr</span>
                  </div>
                )}
              </div>
              {isMultiItem && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="text-xs text-[#ffe0d4]">
                    Print subtotal: ₹{groupedItems.reduce((sum, item) => sum + Number(item.price), 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-[#ffe0d4]">
                    Total print time: {groupedItems.reduce((sum, item) => sum + Number(item.estimated_time), 0).toFixed(1)} hr
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                Delivery address
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {row.full_name} · {row.phone}
              </div>
              <div className="mt-2 space-y-1 text-sm leading-7 text-white">
                {addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
