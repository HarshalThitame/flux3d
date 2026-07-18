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
  material_cost: number
  machine_cost: number
  subtotal: number
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
  final_price: number | null
  grand_total: number | null
  price: number
  discount: number | null
  cart_discount: number | null
  cart_discount_percent: number | null
  coupon_discount: number | null
  offer_discount: number | null
  offer_name: string | null
  cancel_requested: boolean | null
  overhead_percent: number | null
  overhead_amount: number | null
  margin_percent: number | null
  margin_amount: number | null
  coupon_code: string | null
  coupon_id: string | null
  discount_type: string | null
  estimated_time: number
  status: OrderStatus
  payment_status: string
  payment_provider: string | null
  payment_method: string | null
  payment_amount_paise: number
  payment_currency: string
  provider_order_id: string | null
  provider_payment_id: string | null
  payment_verified_at: string | null
  payment_failed_at: string | null
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
      'id, order_number, group_id, file_url, material, color, infill, layer_height, quantity, supports, post_processing_level, post_processing_charges, price_per_unit, material_cost, machine_cost, subtotal, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, final_price, grand_total, price, discount, cart_discount, cart_discount_percent, coupon_discount, offer_discount, offer_name, overhead_percent, overhead_amount, margin_percent, margin_amount, coupon_code, coupon_id, discount_type, estimated_time, status, payment_status, payment_provider, payment_method, payment_amount_paise, payment_currency, provider_order_id, provider_payment_id, payment_verified_at, payment_failed_at, cancel_requested, notes, created_at'
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
        'id, order_number, group_id, file_url, material, color, infill, layer_height, quantity, supports, post_processing_level, post_processing_charges, price_per_unit, material_cost, machine_cost, subtotal, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, final_price, grand_total, price, discount, cart_discount, cart_discount_percent, coupon_discount, offer_discount, offer_name, overhead_percent, overhead_amount, margin_percent, margin_amount, coupon_code, coupon_id, discount_type, estimated_time, status, cancel_requested, notes, created_at'
      )
      .eq('group_id', row.group_id)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })

    if (groupData && groupData.length > 0) {
      groupedItems = groupData as OrderDetailRow[]
    }
  }

  const isMultiItem = groupedItems.length > 1
  const orderSubtotal = groupedItems.reduce((sum, item) => sum + Number(item.subtotal ?? item.price), 0)
  const orderMaterialCost = groupedItems.reduce((sum, item) => sum + Number(item.material_cost ?? 0), 0)
  const orderMachineCost = groupedItems.reduce((sum, item) => sum + Number(item.machine_cost ?? 0), 0)
  const orderOverheadAmount = groupedItems.reduce((sum, item) => sum + Number(item.overhead_amount ?? 0), 0)
  const orderMarginAmount = groupedItems.reduce((sum, item) => sum + Number(item.margin_amount ?? 0), 0)
  const orderTotalPrice = groupedItems.reduce((sum, item) => sum + Number(item.total_price), 0)
  const orderFinalPrice = groupedItems.reduce((sum, item) => sum + Number(item.final_price ?? 0), 0)
  const orderDeliveryCharge = groupedItems.reduce((sum, item) => sum + Number(item.delivery_charge), 0)
  const orderGrandTotal = groupedItems.reduce((sum, item) => sum + Number(item.grand_total ?? 0), 0)
  const cartDiscountAmount = groupedItems.reduce((sum, item) => sum + Number(item.cart_discount ?? 0), 0)
  const couponDiscountAmount = groupedItems.reduce((sum, item) => sum + Number(item.coupon_discount ?? 0), 0)
  const offerDiscountAmount = groupedItems.reduce((sum, item) => sum + Number(item.offer_discount ?? 0), 0)
  const cartDiscountPercent = Number(
    groupedItems.find((item) => Number(item.cart_discount_percent ?? 0) > 0)?.cart_discount_percent ?? row.cart_discount_percent ?? 0
  )
  const offerName = groupedItems.find((item) => item.offer_name)?.offer_name ?? null
  const cartDiscountLabel =
    cartDiscountAmount > 0
      ? cartDiscountPercent > 0
        ? `Cart discount ${cartDiscountPercent}% · -₹${cartDiscountAmount.toFixed(2)}`
        : `Cart discount · -₹${cartDiscountAmount.toFixed(2)}`
      : null
  const overheadPercent = Number(row.overhead_percent ?? 0)
  const marginPercent = Number(row.margin_percent ?? 0)
  const hasAnyDiscount = cartDiscountAmount > 0 || couponDiscountAmount > 0 || offerDiscountAmount > 0

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <Navbar transparent />
      <main className="px-4 pb-16 pt-8 md:px-8 md:pt-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[32px] border border-[#6d28d9]/10 bg-[rgba(255,255,255,0.96)] p-6 backdrop-blur-2xl">
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
                <div className="mt-2 text-sm text-[#6d28d9]">
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
                {row.payment_status === 'paid'
                  ? 'This order has a verified payment attached and is moving through production.'
                  : 'This order can be paid securely through Razorpay once it is ready for checkout.'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div
                className={`inline-flex rounded-full border px-4 py-2 text-sm ${getOrderStatusClasses(row.status)}`}
              >
                {getOrderStatusLabel(row.status)}
              </div>
              <div className="flex gap-2">
              {['pending', 'confirmed'].includes(row.status) && !row.cancel_requested && (
                <CancelOrderButton orderId={orderId} />
              )}
              {['confirmed', 'printing', 'shipped', 'delivered', 'completed'].includes(row.status) && (
                <DownloadInvoiceButton orderId={orderId} />
              )}
              </div>
              {row.cancel_requested && (
                <div className="text-xs font-medium text-rose-600">Cancellation requested</div>
              )}
            </div>
          </div>
        </div>

        {isMultiItem && (
          <div className="rounded-[28px] border border-[#6d28d9]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
              Order Items ({groupedItems.length})
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {groupedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-[#6d28d9]/10 bg-[#FFFFFF] p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#0F1B3D]">{item.material}</div>
                      <div className="mt-1 text-sm text-[#6F7192]">{item.color}</div>
                    </div>
                    <div className="font-[var(--font-syne)] text-xl font-bold text-[#6d28d9]">
                      ₹{Number(item.total_price).toFixed(0)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Infill</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.infill}%</div>
                    </div>
                    <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Layer</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{Number(item.layer_height)} mm</div>
                    </div>
                    <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Qty</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.quantity ?? 1}</div>
                    </div>
                    <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Supports</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.supports ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Post-process</div>
                      <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.post_processing_level ?? 'None'}</div>
                    </div>
                    <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
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
            <div className="rounded-[28px] border border-[#6d28d9]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                Configuration
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Material</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.material}</div>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Color</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.color}</div>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Infill</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.infill}%</div>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Layer height</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{Number(row.layer_height)} mm</div>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Quantity</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.quantity ?? 1}</div>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Supports</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.supports ? 'Included' : 'Not required'}</div>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Post-process</div>
                  <div className="mt-2 text-sm text-[#0F1B3D]">{row.post_processing_level ?? 'None'}</div>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">File</div>
                  <div className="mt-2 break-all text-sm text-[#0F1B3D]">{row.file_url}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">
                  Notes
                </div>
                <div className="mt-2 text-sm leading-7 text-[#0F1B3D]">
                  {row.notes?.trim() ? row.notes : 'No extra instructions were provided.'}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-[#6d28d9]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
              {isMultiItem ? 'Order Total' : 'Estimate'}
            </h2>
            <div className="mt-5 rounded-[24px] border border-[#6d28d9]/20 bg-[linear-gradient(180deg,rgba(109, 40, 217,0.12),rgba(109, 40, 217,0.06))] p-5 shadow-[0_12px_48px_rgba(109, 40, 217,0.1)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">
                Final price
              </div>
              <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-[#0F1B3D]">
                ₹{orderGrandTotal.toFixed(0)}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#6F7192]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{orderSubtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overhead{overheadPercent > 0 ? ` (${overheadPercent}%)` : ''}</span>
                  <span>₹{orderOverheadAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Margin{marginPercent > 0 ? ` (${marginPercent}%)` : ''}</span>
                  <span>₹{orderMarginAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total price</span>
                  <span>₹{orderTotalPrice.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cart discount{cartDiscountPercent > 0 ? ` ${cartDiscountPercent}%` : ''}</span>
                  <span className={cartDiscountAmount > 0 ? 'text-rose-600' : ''}>
                    {cartDiscountAmount > 0 ? `-₹${cartDiscountAmount.toFixed(0)}` : '₹0'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#6d28d9]/10 pt-2 text-[#0F1B3D]">
                  <span className="font-medium">Final price</span>
                  <span className="font-medium">₹{orderFinalPrice.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery charge</span>
                  <span>
                    {orderDeliveryCharge === 0
                      ? 'FREE'
                      : `₹${orderDeliveryCharge.toFixed(0)}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#6d28d9]/10 pt-2 text-[#0F1B3D]">
                  <span className="font-medium">Grand total</span>
                  <span className="font-medium">₹{orderGrandTotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price per unit</span>
                  <span>₹{Number(row.price_per_unit).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Post-processing</span>
                  <span>₹{Number(row.post_processing_charges).toFixed(0)}</span>
                </div>
                {!isMultiItem && (
                  <div className="flex justify-between">
                    <span>Estimated print time</span>
                    <span>{Number(row.estimated_time).toFixed(1)} hr</span>
                  </div>
                )}
              </div>
              {isMultiItem && (
                <div className="mt-4 border-t border-[#6d28d9]/10 pt-3">
                  <div className="text-xs text-[#6F7192]">
                    Material cost: ₹{orderMaterialCost.toFixed(0)}
                  </div>
                  <div className="text-xs text-[#6F7192]">
                    Machine cost: ₹{orderMachineCost.toFixed(0)}
                  </div>
                  <div className="text-xs text-[#6F7192]">
                    Print subtotal: ₹{orderSubtotal.toFixed(0)}
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
                {hasAnyDiscount ? 'Discounts applied to this order' : 'No discount applied'}
              </div>
              {cartDiscountLabel && (
                <div className="mt-1 text-xs text-[#6F7192]">
                  {cartDiscountLabel}
                </div>
              )}
              {couponDiscountAmount > 0 && (
                <div className="mt-1 text-xs text-[#6F7192]">
                  Coupon{row.coupon_code ? ` (${row.coupon_code})` : ''}: -₹{couponDiscountAmount.toFixed(2)}
                </div>
              )}
              {offerDiscountAmount > 0 && (
                <div className="mt-1 text-xs text-[#6F7192]">
                  Offer{offerName ? ` (${offerName})` : ''}: -₹{offerDiscountAmount.toFixed(2)}
                </div>
              )}
              {!hasAnyDiscount && (
                <div className="mt-1 text-xs text-[#6F7192]">
                  No discount applied
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
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

            <div className="rounded-[28px] border border-[#6d28d9]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                Payment
              </h2>
              <div className="mt-4 rounded-[20px] border border-[#6d28d9]/10 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#9ca3af]">Status</div>
                <div className="mt-2 text-lg font-bold text-[#0F1B3D]">{row.payment_status}</div>
                <div className="mt-3 text-sm text-[#6F7192]">
                  Provider: {row.payment_provider ?? row.payment_method ?? 'Not set'}
                </div>
                <div className="mt-1 text-sm text-[#6F7192]">
                  Amount: ₹{Math.round(Number(row.payment_amount_paise ?? 0) / 100).toLocaleString('en-IN')}
                </div>
              </div>
              {row.payment_status !== 'paid' && (
                <Link
                  href={`/my-orders/${orderId}/pay`}
                  className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[#6d28d9] px-5 text-sm font-semibold text-white"
                >
                  Pay securely with Razorpay
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  )
}
