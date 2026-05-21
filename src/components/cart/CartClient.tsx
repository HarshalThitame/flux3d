'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, ShoppingCart, ArrowRight, Plus, IndianRupee, Edit2, AlertTriangle, X, Tag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart/context'
import type { AppUserProfile } from '@/lib/auth/server'
import EmptyState from '@/components/admin/EmptyState'
import type { QuoteMaterial } from '@/lib/quote/types'
import { formatDurationMinutes } from '@/lib/quote/pricing-engine'
import CouponInput, { type CouponResult } from '@/components/offers/CouponInput'
import { calculatePricingWaterfall } from '@/lib/quote/pricing-waterfall'

type CartClientProps = {
  user: AppUserProfile | null
  materials: QuoteMaterial[]
}

type EditingItem = {
  id: string
  addedAt: string
}

export default function CartClient({ user }: CartClientProps) {
  const router = useRouter()
  const { items, summary, removeItem, updateItem, clearItems, isLoading, setAppliedCoupon } = useCart()
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const couponOrderAmount = Math.max(0, summary.itemsTotal - summary.cartDiscountAmount)
  const cartDiscountPercent = Math.round(summary.cartDiscountPercent)

  const handleRemoveItem = (addedAt: string) => {
    removeItem(addedAt)
  }

  const handleClearCart = () => {
    clearItems()
    setShowClearConfirm(false)
  }

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?next=%2Fcart')
      return
    }
    router.push('/cart/delivery')
  }

  const handleEditItem = (item: typeof items[0]) => {
    setEditingItem({
      id: item.id ?? '',
      addedAt: item.addedAt ?? '',
    })
  }

  const getQuantityPricingSnapshot = (item: typeof items[number], nextQuantity: number) => {
    const currentQuantity = Math.max(1, item.quantity ?? 1)
    const quantity = Math.max(1, nextQuantity)
    const waterfall = calculatePricingWaterfall({
      materialCost: (Number(item.materialCost ?? 0) / currentQuantity) * quantity,
      machineCost: (Number(item.machineCost ?? 0) / currentQuantity) * quantity,
      postProcessingCharges: (Number(item.postProcessingCharges ?? 0) / currentQuantity) * quantity,
      quantity,
      overheadPercent: Number(item.overheadPercentage ?? 0),
      marginPercent: Number(item.marginPercentage ?? 0),
      deliveryCharge: 0,
    })

    return {
      materialCost: waterfall.materialCost,
      machineCost: waterfall.machineCost,
      subtotal: waterfall.subtotal,
      postProcessingCharges: waterfall.postProcessingCharges,
      overheadAmount: waterfall.overheadAmount,
      marginAmount: waterfall.marginAmount,
      totalPrice: waterfall.priceBeforeDiscount,
      finalPrice: waterfall.finalPrice,
      deliveryCharge: 0,
      grandTotal: waterfall.finalPrice,
      price: waterfall.finalPrice,
    }
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="mx-auto h-12 w-12 animate-pulse text-[#6d28d9]" />
          <p className="mt-4 text-sm text-[#6F7192]">Loading your cart...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-8 md:px-8 md:pt-10 xl:px-10">
        <div className="mx-auto max-w-[800px]">
          <EmptyState
            title="Your cart is empty"
            description="Add items from the instant quote page to build your cart."
            ctaLabel="Add Items to Cart"
            ctaHref="/instant-quote"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(109, 40, 217,0.08),transparent_24%),radial-gradient(circle_at_right,rgba(168, 85, 247,0.08),transparent_28%),#FFFFFF] px-4 pb-16 pt-8 md:px-8 md:pt-10 xl:px-10">
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/25 bg-[#6d28d9]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#6d28d9]">
            Shopping Cart
          </div>
          <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-[0.98] tracking-[-2px] text-[#0F1B3D]">
            Review Your <span className="text-[#7dd3fc]">Print Items</span>
          </h1>
          <p className="mt-4 max-w-[600px] text-base leading-7 text-[#6F7192]">
            You have {items.length} item{items.length !== 1 ? 's' : ''} in your cart. Modify settings and proceed to delivery.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {items.map((item, index) => {
              const isEditing = editingItem?.id === item.id && (editingItem?.addedAt ?? '') === (item.addedAt ?? '')
              return (
                <motion.div
                  key={`${item.id}-${item.addedAt ?? index}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 shadow-[0_12px_50px_rgba(0,0,0,0.25)] transition-colors ${
                    isEditing ? 'border-[#6d28d9]/40' : 'border-[#6d28d9]/10'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-[#0F1B3D]">{item.name}</h3>
                          <p className="mt-1 text-sm text-[#6F7192]">Quote: {item.id}</p>
                        </div>
                        <div className="flex gap-2">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="rounded-lg border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 p-2.5 text-[#7dd3fc] transition-colors hover:bg-[#7dd3fc]/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                              aria-label={`Edit ${item.name} settings`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.addedAt ?? '')}
                            className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-2.5 text-rose-400 transition-colors hover:bg-rose-400/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Material</div>
                          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.material}</div>
                        </div>

                        <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Color</div>
                          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">
                            {item.color}
                          </div>
                        </div>

                        <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Infill</div>
                          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.infill}%</div>
                        </div>

                        <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Layer Height</div>
                          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{item.layerHeight} mm</div>
                        </div>

                        <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Weight</div>
                          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{(item.weight ?? 0).toFixed(1)} g</div>
                        </div>

                        <div className="rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Print Time</div>
                           <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{formatDurationMinutes((item.estimatedTime ?? 0) * 60)}</div>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3">
                          <p className="text-sm font-medium text-amber-800">
                            Re-upload or re-quote to change material settings. Cart items do not keep the STL mesh data required for an exact recalculation.
                          </p>
                          <div className="mt-3 flex gap-3">
                            <Link
                              href="/instant-quote"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95"
                            >
                              Re-quote item
                            </Link>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#0F1B3D] transition-colors hover:bg-white/[0.07]"
                          >
                            Cancel
                          </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6F7192]">
                        <span className="rounded-full border border-[#6d28d9]/10 bg-white/[0.03] px-2 py-1">
                          {(item.dimensions?.x ?? 0).toFixed(0)} × {(item.dimensions?.y ?? 0).toFixed(0)} × {(item.dimensions?.z ?? 0).toFixed(0)} mm
                        </span>
                        {item.supports && (
                          <span className="rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-2 py-1 text-[#6d28d9]">
                            Supports included
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 md:w-44">
                      <div className="w-full">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Quantity</div>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={item.quantity ?? 1}
                          onChange={(e) => {
                            const qty = Math.max(1, Math.floor(Number(e.target.value) || 1))
                            updateItem(item.addedAt ?? '', {
                              quantity: qty,
                              ...getQuantityPricingSnapshot(item, qty),
                            })
                          }}
                          className="mt-1 w-full rounded-lg border border-[#6d28d9]/10 bg-white/[0.02] px-2.5 py-1.5 text-right text-sm font-medium text-[#0F1B3D] outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Price</div>
                        <div className="font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">
                          ₹{item.price.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-[28px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.96))] p-5 md:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.3)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">
                  Order Summary
                </h2>
                <p className="mt-1 text-sm text-[#6F7192]">
                  Before delivery
                </p>
              </div>
              <div className="rounded-xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 p-2.5 text-[#6d28d9]">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#6d28d9]/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#aeb8d8]">Items Total ({summary.itemCount})</span>
                <span className="font-medium text-[#0F1B3D]">₹{summary.itemsTotal.toFixed(0)}</span>
              </div>
              {summary.cartDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#10B981]">Cart Discount {cartDiscountPercent}%</span>
                  <span className="font-medium text-[#10B981]">-₹{summary.cartDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {summary.couponDiscountAmount > 0 && summary.appliedCoupon && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#10B981]">
                    Coupon ({summary.appliedCoupon.code})
                  </span>
                  <span className="font-medium text-[#10B981]">-₹{summary.couponDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {summary.offerDiscountAmount > 0 && summary.appliedOffer && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#10B981]">
                    Offer ({summary.appliedOffer.title})
                  </span>
                  <span className="font-medium text-[#10B981]">-₹{summary.offerDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#aeb8d8]">Final Price</span>
                <span className="font-medium text-[#0F1B3D]">₹{summary.finalPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#aeb8d8]">Delivery</span>
                <span className="font-medium text-[#0F1B3D]">
                  {summary.deliveryCharge === 0 ? 'FREE' : `₹${summary.deliveryCharge.toFixed(0)}`}
                </span>
              </div>
              <div className="border-t border-[#6d28d9]/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-[#0F1B3D]">Grand Total</span>
                  <span className="font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">
                    ₹{summary.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {summary.appliedOffer && summary.offerDiscountAmount > 0 && (
                <div className="rounded-xl border border-[rgba(109, 40, 217,0.2)] bg-[rgba(109, 40, 217,0.06)] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-[#6d28d9]">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="font-semibold">
                      {summary.appliedOffer.badge_text ??
                        `${summary.appliedOffer.title} — ${summary.appliedOffer.sale_label ?? `${summary.appliedOffer.discount_value}% Off`} Applied 🎉`}
                    </span>
                    <span className="text-xs opacity-70">-₹{summary.offerDiscountAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3.5 h-3.5 text-[#6F7192]" />
                  <span className="text-xs font-medium text-[#6F7192] uppercase tracking-wider">Have a coupon?</span>
                </div>
                <CouponInput
                  orderAmount={couponOrderAmount}
                  userId={user?.id ?? null}
                  onApply={(result: CouponResult) => {
                    if (result.valid && result.coupon) {
                      setAppliedCoupon(result.coupon)
                    }
                  }}
                  appliedCoupon={summary.appliedCoupon ? { valid: true, coupon: summary.appliedCoupon } : null}
                  onRemove={() => setAppliedCoupon(null)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCheckout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#6d28d9] px-4 py-4 text-sm font-semibold text-white transition-all hover:translate-y-[-1px] hover:opacity-95 min-h-[52px]"
              >
                Proceed to Delivery
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex w-full items-center justify-center rounded-[16px] border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-[#0F1B3D] transition-colors hover:bg-white/[0.07] min-h-[48px]"
              >
                Clear Cart
              </button>
              <Link
                href="/instant-quote"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#6d28d9]/10 bg-transparent px-4 py-3.5 text-sm font-medium text-[#7dd3fc] transition-colors hover:border-[#7dd3fc]/30 min-h-[48px]"
              >
                <Plus className="h-4 w-4" />
                Add More Items
              </Link>
            </div>
          </motion.aside>
        </div>
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-md overflow-hidden rounded-[28px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="relative p-6 pb-0">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="absolute right-4 top-4 rounded-lg border border-[#6d28d9]/10 bg-white/[0.03] p-1.5 text-[#6F7192] transition-colors hover:bg-white/[0.07] hover:text-[#0F1B3D]"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10">
                  <AlertTriangle className="h-7 w-7 text-rose-400" />
                </div>

                <h3 className="text-center text-xl font-semibold text-[#0F1B3D]">Clear Your Cart?</h3>
                <p className="mt-2 text-center text-sm leading-6 text-[#6F7192]">
                  This will remove all <span className="font-medium text-[#0F1B3D]">{items.length} item{items.length !== 1 ? 's' : ''}</span> from your cart. This action cannot be undone.
                </p>
              </div>

              <div className="mt-5 flex gap-3 border-t border-[#6d28d9]/10 p-4">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-xl border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#0F1B3D] transition-colors hover:bg-white/[0.07]"
                >
                  Keep Items
                </button>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] transition-all hover:bg-rose-500/90"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
