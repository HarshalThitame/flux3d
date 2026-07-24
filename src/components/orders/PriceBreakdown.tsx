'use client'

interface PriceBreakdownProps {
  subtotal: number
  overheadPercent: number
  overheadAmount: number
  marginPercent: number
  marginAmount: number
  totalPrice: number
  cartDiscountAmount: number
  cartDiscountPercent: number
  cartDiscountLabel: string | null
  couponDiscountAmount: number
  couponCode: string | null
  offerDiscountAmount: number
  offerName: string | null
  finalPrice: number
  deliveryCharge: number
  grandTotal: number
  pricePerUnit?: number
  postProcessingCharges?: number
  estimatedTime?: number
  isMultiItem?: boolean
  materialCost?: number
  machineCost?: number
  totalPrintTime?: number
}

export function PriceBreakdown({
  subtotal,
  overheadPercent,
  overheadAmount,
  marginPercent,
  marginAmount,
  totalPrice,
  cartDiscountAmount,
  cartDiscountPercent,
  cartDiscountLabel,
  couponDiscountAmount,
  couponCode,
  offerDiscountAmount,
  offerName,
  finalPrice,
  deliveryCharge,
  grandTotal,
  pricePerUnit,
  postProcessingCharges,
  estimatedTime,
  isMultiItem = false,
  materialCost,
  machineCost,
  totalPrintTime,
}: PriceBreakdownProps) {
  const hasAnyDiscount = cartDiscountAmount > 0 || couponDiscountAmount > 0 || offerDiscountAmount > 0

  return (
    <div className="rounded-2xl border border-[#6d28d9]/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F1B3D]">
          {isMultiItem ? 'Order Total' : 'Price Breakdown'}
        </h3>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Grand Total</div>
          <div className="text-xl font-bold text-[#6d28d9]">₹{grandTotal.toFixed(0)}</div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="font-medium">₹{subtotal.toFixed(0)}</span>
        </div>

        {overheadAmount > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Overhead{overheadPercent > 0 ? ` (${overheadPercent}%)` : ''}</span>
            <span className="font-medium">₹{overheadAmount.toFixed(0)}</span>
          </div>
        )}

        {marginAmount > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Margin{marginPercent > 0 ? ` (${marginPercent}%)` : ''}</span>
            <span className="font-medium">₹{marginAmount.toFixed(0)}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-gray-100 pt-2 text-gray-600">
          <span className="font-medium">Total price</span>
          <span className="font-medium">₹{totalPrice.toFixed(0)}</span>
        </div>

        {cartDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Cart discount{cartDiscountPercent > 0 ? ` ${cartDiscountPercent}%` : ''}</span>
            <span className="font-medium">-₹{cartDiscountAmount.toFixed(0)}</span>
          </div>
        )}

        {couponDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Coupon{couponCode ? ` (${couponCode})` : ''}</span>
            <span className="font-medium">-₹{couponDiscountAmount.toFixed(2)}</span>
          </div>
        )}

        {offerDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Offer{offerName ? ` (${offerName})` : ''}</span>
            <span className="font-medium">-₹{offerDiscountAmount.toFixed(2)}</span>
          </div>
        )}

        {!hasAnyDiscount && (
          <div className="flex justify-between text-gray-400">
            <span>Discounts</span>
            <span>None</span>
          </div>
        )}

        <div className="flex justify-between border-t border-gray-100 pt-2 text-gray-600">
          <span className="font-medium">Final price</span>
          <span className="font-medium">₹{finalPrice.toFixed(0)}</span>
        </div>

        <div className="flex justify-between text-gray-600">
          <span>Delivery</span>
          <span className={deliveryCharge === 0 ? 'font-semibold text-emerald-700' : 'font-medium'}>
            {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(0)}`}
          </span>
        </div>

        <div className="flex justify-between border-t-2 border-[#6d28d9]/20 pt-2">
          <span className="text-base font-bold text-[#0F1B3D]">Grand total</span>
          <span className="text-base font-bold text-[#6d28d9]">₹{grandTotal.toFixed(0)}</span>
        </div>

        {!isMultiItem && pricePerUnit !== undefined && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Price per unit</span>
            <span>₹{pricePerUnit.toFixed(0)}</span>
          </div>
        )}

        {!isMultiItem && postProcessingCharges !== undefined && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Post-processing</span>
            <span>₹{postProcessingCharges.toFixed(0)}</span>
          </div>
        )}

        {!isMultiItem && estimatedTime !== undefined && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Est. print time</span>
            <span>{estimatedTime.toFixed(1)} hr</span>
          </div>
        )}
      </div>

      {isMultiItem && materialCost !== undefined && (
        <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Material cost</span>
            <span>₹{materialCost.toFixed(0)}</span>
          </div>
          {machineCost !== undefined && (
            <div className="flex justify-between">
              <span>Machine cost</span>
              <span>₹{machineCost.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Print subtotal</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>
          {totalPrintTime !== undefined && (
            <div className="flex justify-between">
              <span>Total print time</span>
              <span>{totalPrintTime.toFixed(1)} hr</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
