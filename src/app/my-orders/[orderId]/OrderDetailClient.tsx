'use client'

import { useState } from 'react'
import Link from 'next/link'
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline'
import { PriceBreakdown } from '@/components/orders/PriceBreakdown'
import { CompactInfoGrid } from '@/components/orders/CompactInfoGrid'
import { CancelOrderButton } from './CancelOrderButton'
import { DownloadInvoiceButton } from './DownloadInvoiceButton'
import type { OrderStatus } from '@/lib/orders'

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
  status: OrderStatus
  payment_status: string
  payment_provider: string | null
  payment_method: string | null
  payment_amount_paise: number
  payment_currency: string
  payment_verified_at: string | null
  notes: string | null
  cancel_requested: boolean | null
  overhead_percent: number | null
  overhead_amount: number | null
  margin_percent: number | null
  margin_amount: number | null
  coupon_code: string | null
  discount_type: string | null
  estimated_time: number
  cart_discount: number | null
  cart_discount_percent: number | null
  coupon_discount: number | null
  offer_discount: number | null
  offer_name: string | null
}

interface OrderDetailClientProps {
  row: OrderDetailRow
  groupedItems: OrderDetailRow[]
  isMultiItem: boolean
  orderSubtotal: number
  orderMaterialCost: number
  orderMachineCost: number
  orderOverheadAmount: number
  orderMarginAmount: number
  orderTotalPrice: number
  orderFinalPrice: number
  orderDeliveryCharge: number
  orderGrandTotal: number
  cartDiscountAmount: number
  couponDiscountAmount: number
  offerDiscountAmount: number
  cartDiscountPercent: number
  offerName: string | null
  cartDiscountLabel: string | null
  overheadPercent: number
  marginPercent: number
  hasAnyDiscount: boolean
  totalPrintTime: number
  addressLines: string[]
  isUnpaid: boolean
  isCancelable: boolean
  orderId: string
}

function OrderItemAccordion({ item }: { item: OrderDetailRow }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="order-item-accordion">
      <button
        type="button"
        className="order-item-accordion-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[#0F1B3D]">{item.material}</div>
          <div className="text-xs text-gray-500">{item.color} · Qty: {item.quantity ?? 1}</div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-sm font-bold text-[#6d28d9]">
            ₹{Number(item.total_price).toFixed(0)}
          </span>
          <svg
            className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`order-item-accordion-content ${expanded ? 'expanded' : ''}`}>
        <div className="border-t border-gray-100 px-4 pb-3 pt-2">
          <CompactInfoGrid
            columns={2}
            items={[
              { label: 'Infill', value: `${item.infill}%` },
              { label: 'Layer', value: `${Number(item.layer_height)} mm` },
              { label: 'Supports', value: item.supports ? 'Yes' : 'No' },
              { label: 'Post-process', value: item.post_processing_level ?? 'None' },
              { label: 'PP cost', value: `₹${Number(item.post_processing_charges).toFixed(0)}` },
              { label: 'Est. time', value: `${Number(item.estimated_time).toFixed(1)} hr` },
            ]}
          />
          {item.file_url && (
            <a
              href={item.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link mt-3"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V10.5m-10.5 6L21 3.75m-10.5 0h10.5m-10.5 0v10.5" />
              </svg>
              <span className="file-path">{item.file_url}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export function OrderDetailClient({
  row,
  groupedItems,
  isMultiItem,
  orderSubtotal,
  orderMaterialCost,
  orderMachineCost,
  orderOverheadAmount,
  orderMarginAmount,
  orderTotalPrice,
  orderFinalPrice,
  orderDeliveryCharge,
  orderGrandTotal,
  cartDiscountAmount,
  couponDiscountAmount,
  offerDiscountAmount,
  cartDiscountPercent,
  offerName,
  cartDiscountLabel,
  overheadPercent,
  marginPercent,
  hasAnyDiscount,
  totalPrintTime,
  addressLines,
  isUnpaid,
  isCancelable,
  orderId,
}: OrderDetailClientProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = () => {
    const text = `${row.full_name}, ${row.phone}, ${addressLines.join(', ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Status Timeline */}
      <div className="order-section">
        <h2 className="mb-3 text-sm font-semibold text-[#0F1B3D]">Order Progress</h2>
        <OrderStatusTimeline currentStatus={row.status} />
      </div>

      {/* Configuration / Items */}
      {isMultiItem ? (
        <div className="order-section">
          <h2 className="mb-3 text-sm font-semibold text-[#0F1B3D]">
            Order Items ({groupedItems.length})
          </h2>
          <div className="space-y-2">
            {groupedItems.map((item) => (
              <OrderItemAccordion key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : (
        <div className="order-section">
          <h2 className="mb-3 text-sm font-semibold text-[#0F1B3D]">Configuration</h2>
          <CompactInfoGrid
            columns={2}
            items={[
              { label: 'Material', value: row.material },
              { label: 'Color', value: row.color },
              { label: 'Infill', value: `${row.infill}%` },
              { label: 'Layer height', value: `${Number(row.layer_height)} mm` },
              { label: 'Quantity', value: `${row.quantity ?? 1}` },
              { label: 'Supports', value: row.supports ? 'Included' : 'Not required' },
              { label: 'Post-process', value: row.post_processing_level ?? 'None' },
              { label: 'Est. time', value: `${Number(row.estimated_time).toFixed(1)} hr` },
            ]}
          />
          {row.file_url && (
            <a
              href={row.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link mt-3"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V10.5m-10.5 6L21 3.75m-10.5 0h10.5m-10.5 0v10.5" />
              </svg>
              <span className="file-path">{row.file_url}</span>
            </a>
          )}
          {row.notes?.trim() && (
            <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Notes</div>
              <div className="mt-1 text-sm leading-relaxed text-[#0F1B3D]">{row.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* Payment Status */}
      <div className="order-section">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F1B3D]">Payment</h2>
          {row.payment_status === 'paid' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Paid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Pending
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Method</div>
            <div className="mt-0.5 font-medium text-[#0F1B3D]">
              {row.payment_provider ?? row.payment_method ?? 'Not set'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Amount</div>
            <div className="mt-0.5 font-medium text-[#0F1B3D]">
              ₹{Math.round(Number(row.payment_amount_paise ?? 0) / 100).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        {row.payment_verified_at && (
          <div className="mt-2 text-xs text-gray-500">
            Verified on {new Date(row.payment_verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <PriceBreakdown
        subtotal={orderSubtotal}
        overheadPercent={overheadPercent}
        overheadAmount={orderOverheadAmount}
        marginPercent={marginPercent}
        marginAmount={orderMarginAmount}
        totalPrice={orderTotalPrice}
        cartDiscountAmount={cartDiscountAmount}
        cartDiscountPercent={cartDiscountPercent}
        cartDiscountLabel={cartDiscountLabel}
        couponDiscountAmount={couponDiscountAmount}
        couponCode={row.coupon_code}
        offerDiscountAmount={offerDiscountAmount}
        offerName={offerName}
        finalPrice={orderFinalPrice}
        deliveryCharge={orderDeliveryCharge}
        grandTotal={orderGrandTotal}
        pricePerUnit={row.price_per_unit}
        postProcessingCharges={row.post_processing_charges}
        estimatedTime={row.estimated_time}
        isMultiItem={isMultiItem}
        materialCost={orderMaterialCost}
        machineCost={orderMachineCost}
        totalPrintTime={totalPrintTime}
      />

      {/* Delivery Address */}
      <div className="order-section">
        <h2 className="mb-3 text-sm font-semibold text-[#0F1B3D]">Delivery Address</h2>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#0F1B3D]">
              {row.full_name} · {row.phone}
            </div>
            <div className="mt-1.5 space-y-0.5 text-sm leading-relaxed text-gray-600">
              {addressLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="copy-address-btn flex-shrink-0"
            onClick={handleCopyAddress}
          >
            {copied ? (
              <>
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.925.183 1.1.125 1.975 1.06 1.975 2.166v9.75c0 1.106-.875 2.04-1.975 2.166a43.498 43.498 0 01-5.469.318h-2.28c-.77 0-1.536-.03-2.296-.09-1.1-.086-1.975-1.02-1.975-2.126v-9.75c0-1.107.875-2.04 1.975-2.166.637-.073 1.279-.134 1.925-.183" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      {isUnpaid && (
        <div className="sticky-bottom-bar">
          <Link
            href={`/my-orders/${orderId}/pay`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] py-3 text-sm font-semibold text-white shadow-lg shadow-[#6d28d9]/25 transition hover:shadow-xl hover:shadow-[#6d28d9]/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            Pay ₹{orderGrandTotal.toFixed(0)} securely
          </Link>
        </div>
      )}

      {isCancelable && !isUnpaid && (
        <div className="sticky-bottom-bar">
          <CancelOrderButton orderId={orderId} />
        </div>
      )}
    </>
  )
}
