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
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { loadOrderDiscountSummary } from '@/lib/order-discounts'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DownloadInvoiceButton } from './DownloadInvoiceButton'
import { CancelOrderButton } from './CancelOrderButton'

type OrderDetailRow = {
  id: string
  order_number: string | null
  group_id: string | null
  file_url: string
  material: string
  color: string
  infill: number
  layer_height: number
  quantity: number
  supports: boolean
  post_processing_level: string | null
  post_processing_charges: number
  price_per_unit: number
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
  discount: number | null
  coupon_code: string | null
  coupon_id: string | null
  discount_type: string | null
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
      'id, order_number, group_id, file_url, material, color, infill, layer_height, quantity, supports, post_processing_level, post_processing_charges, price_per_unit, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, price, discount, coupon_code, coupon_id, discount_type, estimated_time, status, notes, created_at'
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
        'id, order_number, group_id, file_url, material, color, infill, layer_height, quantity, supports, post_processing_level, post_processing_charges, price_per_unit, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, price, discount, coupon_code, coupon_id, discount_type, estimated_time, status, notes, created_at'
      )
      .eq('group_id', row.group_id)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })

    if (groupData && groupData.length > 0) {
      groupedItems = groupData as OrderDetailRow[]
    }
  }

  const isMultiItem = groupedItems.length > 1
  const discountSummary = await (loadOrderDiscountSummary as any)(createAdminSupabaseClient(), groupedItems)

  return (
    <div className="min-h-screen bg-[#FFFFFF] px-4 pb-16 pt-28 text-[#0F1B3D] md:px-8">
      <Navbar transparent />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[32px] border border-[#7C5CFF]/10 bg-[rgba(255,255,255,0.96)] p-6 backdrop-blur-2xl">
          <Link
            href="/my-orders"
            className="inline-flex text-sm text-[#6F7192] transition-colors hover:text-[#0F1B3D]"
          >
            Back to orders
          </Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">
                Order request
              </div>
              <h1 className="mt-3 font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D]">
                {row.order_number ?? row.id}
              </h1>
              {isMultiItem && (
                <div className="mt-2 text-sm text-[#7C5CFF]">
                  {groupedItems.length} items in this order
                </div>
              )}
              <p className="mt-3 max-w-2xl text-base leading-8 text-[#6F7192]">
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
                  <CancelOrderButton orderId={orderId} />
                )}
                {['shipped', 'completed'].includes(row.status) && (
                  <DownloadInvoiceButton orderId={orderId} />
                )}
              </div>
            </div>
          </div>
        </div>

        {isMultiItem && (
          <div className="rounded-[28px] border border-[#7C5CFF]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
              Order Items ({groupedItems.length})
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {groupedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-[#7C5CFF]/10 bg-[#FFFFFF] p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#0F1B3D]">{item.material}</div>
                      <div className="mt-1 text-sm text-[#6F7192]">{item.color}</div>
                    </div>
                    <div className="font-[var(--font-syne)] text-xl font-bold text-[#7C5CFF]">
                      ₹{Number(item.total_price).toFixed(0)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Infill</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.infill}%</div>
                    </div>
                    <div className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Layer</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{Number(item.layer_height)} mm</div>
                    </div>
                    <div className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Qty</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.quantity ?? 1}</div>
                    </div>
                    <div className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Supports</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.supports ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Post-process</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.post_processing_level ?? 'None'}</div>
                    </div>
                    <div className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">PP cost</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">₹{Number(item.post_processing_charges).toFixed(0)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-[#6F7192] break-all truncate">
                    File: {item.file_url}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          {!isMultiItem && (
            <div className="rounded-[28px] border border-[#7C5CFF]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                Configuration
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Material</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.material}</div>
                </div>
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Color</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.color}</div>
                </div>
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Infill</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.infill}%</div>
                </div>
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Layer height</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{Number(row.layer_height)} mm</div>
                </div>
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Quantity</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.quantity ?? 1}</div>
                </div>
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Supports</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.supports ? 'Included' : 'Not required'}</div>
                </div>
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Post-process</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.post_processing_level ?? 'None'}</div>
                </div>
                <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">File</div>
                  <div className="mt-2 break-all text-sm text-[#0F1B3D]">{row.file_url}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">
                  Notes
                </div>
                <div className="mt-2 text-sm leading-7 text-[#0F1B3D]">
                  {row.notes?.trim() ? row.notes : 'No extra instructions were provided.'}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-[#7C5CFF]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
              {isMultiItem ? 'Order Total' : 'Estimate'}
            </h2>
            <div className="mt-5 rounded-[24px] border border-[#7C5CFF]/20 bg-[linear-gradient(180deg,rgba(124, 92, 255,0.12),rgba(124, 92, 255,0.06))] p-5 shadow-[0_12px_48px_rgba(124, 92, 255,0.1)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">
                Total price
              </div>
              <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-[#0F1B3D]">
                ₹{Number(row.total_price).toFixed(0)}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#6F7192]">
                {!isMultiItem && (
                  <>
                    <div className="flex justify-between">
                      <span>Print cost</span>
                      <span>₹{Number(row.price).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price per unit</span>
                      <span>₹{Number(row.price_per_unit).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Post-processing</span>
                      <span>₹{Number(row.post_processing_charges).toFixed(0)}</span>
                    </div>
                  </>
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
                <div className="mt-4 border-t border-[#7C5CFF]/10 pt-3">
                  <div className="text-xs text-[#6F7192]">
                    Print subtotal: ₹{groupedItems.reduce((sum, item) => sum + Number(item.price), 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-[#6F7192]">
                    Total print time: {groupedItems.reduce((sum, item) => sum + Number(item.estimated_time), 0).toFixed(1)} hr
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-700">
                Discount summary
              </div>
              <div className="mt-2 text-sm font-medium text-[#0F1B3D]">
                {discountSummary.amount > 0
                  ? `You saved ₹${discountSummary.amount.toFixed(0)}`
                  : 'No discount was applied'}
              </div>
              {discountSummary.label && discountSummary.amount > 0 && (
                <div className="mt-1 text-xs text-[#6F7192]">
                  Applied via {discountSummary.label}
                </div>
              )}
              <div className="mt-2 text-xs text-[#6F7192]">
                {discountSummary.offerName
                  ? `Offer: ${discountSummary.offerName}`
                  : discountSummary.couponCode
                    ? `Coupon: ${discountSummary.couponCode}`
                    : discountSummary.type
                      ? `Discount type: ${discountSummary.type}`
                      : 'Tracked from the order record'}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">
                Delivery address
              </div>
              <div className="mt-2 text-sm font-medium text-[#0F1B3D]">
                {row.full_name} · {row.phone}
              </div>
              <div className="mt-2 space-y-1 text-sm leading-7 text-[#0F1B3D]">
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
