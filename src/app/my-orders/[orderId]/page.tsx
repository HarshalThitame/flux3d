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
import { OrderDetailClient } from './OrderDetailClient'
import { CancelOrderButton } from './CancelOrderButton'
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
  const totalPrintTime = groupedItems.reduce((sum, item) => sum + Number(item.estimated_time), 0)

  const isUnpaid = row.payment_status !== 'paid'
  const isCancelable = ['pending', 'confirmed'].includes(row.status) && !row.cancel_requested
  const isDownloadable = ['confirmed', 'printing', 'shipped', 'delivered', 'completed'].includes(row.status)

  const date = new Date(row.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#f9f7f4] text-[#070b1d]">
      <Navbar transparent />
      <main className="px-4 pb-24 pt-6 md:px-6 md:pt-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/my-orders"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#070b1d]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to orders</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              {isCancelable && <CancelOrderButton orderId={orderId} />}
              {isDownloadable && <DownloadInvoiceButton orderId={orderId} />}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
              Order Details
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-[#070b1d] md:text-2xl">
                {row.order_number ?? row.id}
              </h1>
              <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getOrderStatusClasses(row.status)}`}>
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
                {getOrderStatusLabel(row.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Placed on {date} · {isMultiItem ? `${groupedItems.length} items` : `${row.material} · ${row.color}`}
            </p>
            {row.cancel_requested && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Cancellation requested
              </div>
            )}
          </div>

          <OrderDetailClient
            row={row}
            groupedItems={groupedItems}
            isMultiItem={isMultiItem}
            orderSubtotal={orderSubtotal}
            orderMaterialCost={orderMaterialCost}
            orderMachineCost={orderMachineCost}
            orderOverheadAmount={orderOverheadAmount}
            orderMarginAmount={orderMarginAmount}
            orderTotalPrice={orderTotalPrice}
            orderFinalPrice={orderFinalPrice}
            orderDeliveryCharge={orderDeliveryCharge}
            orderGrandTotal={orderGrandTotal}
            cartDiscountAmount={cartDiscountAmount}
            couponDiscountAmount={couponDiscountAmount}
            offerDiscountAmount={offerDiscountAmount}
            cartDiscountPercent={cartDiscountPercent}
            offerName={offerName}
            cartDiscountLabel={cartDiscountLabel}
            overheadPercent={overheadPercent}
            marginPercent={marginPercent}
            hasAnyDiscount={hasAnyDiscount}
            totalPrintTime={totalPrintTime}
            addressLines={addressLines}
            isUnpaid={isUnpaid}
            isCancelable={isCancelable}
            orderId={orderId}
          />
        </div>
      </main>
    </div>
  )
}
