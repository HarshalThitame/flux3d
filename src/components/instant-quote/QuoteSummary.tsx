'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Clock3, Cuboid, IndianRupee, PackageCheck, ShoppingCart, Sparkles, Truck } from 'lucide-react'
import { getMaterialById } from '@/lib/quote/materials'
import type { PriceBreakdown, QuoteMaterial } from '@/lib/quote/types'
import type { QuoteConfig } from '@/lib/quote/types'
import { formatDurationMinutes, postProcessingOptions } from '@/lib/quote/pricing-engine'

type QuoteSummaryProps = {
  materials: QuoteMaterial[]
  materialId: string
  quoteId: string
  priceBreakdown: PriceBreakdown | null
  isSignedIn: boolean
  canOrder: boolean
  deliveryCharge: number
  totalPrice: number
  config: QuoteConfig
  onAddToCart: () => void
  isInCart: boolean
}

function SummarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-16 animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
      <div className="h-16 animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
      <div className="h-24 animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
    </div>
  )
}

export default function QuoteSummary({
  materials,
  materialId,
  quoteId,
  priceBreakdown,
  isSignedIn,
  canOrder,
  deliveryCharge,
  totalPrice,
  config,
  onAddToCart,
  isInCart,
}: QuoteSummaryProps) {
  const material = getMaterialById(materialId, materials)

  return (
    <motion.aside
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="relative h-full overflow-hidden rounded-[28px] border border-[#7C5CFF]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.96))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.3)]"
    >
      <motion.div
        aria-hidden
        animate={{ x: [0, 18, 0], y: [0, -10, 0], opacity: [0.24, 0.4, 0.24] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-10 top-14 h-40 w-40 rounded-full bg-[#7C5CFF]/10 blur-3xl"
      />
      <div className="lg:sticky lg:top-24">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
              Price & Quotation
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6F7192]">
              Your live estimate updates instantly so you can make smarter decisions without second-guessing the print.
            </p>
          </div>
          <div className="rounded-2xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 p-3 text-[#7C5CFF]">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        <motion.div
          animate={{ boxShadow: ['0 0 0 rgba(124, 92, 255,0)', '0 0 36px rgba(124, 92, 255,0.08)', '0 0 0 rgba(124, 92, 255,0)'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-4 rounded-[22px] border border-[#7C5CFF]/15 bg-[radial-gradient(circle_at_top,rgba(124, 92, 255,0.18),transparent_48%),rgba(124, 92, 255,0.25)] p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Quote Session</div>
          <div className="mt-2 text-xl font-semibold text-[#0F1B3D]">{quoteId}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/10 bg-white px-3 py-1 text-xs text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[#7C5CFF]" />
            {material.name}
          </div>
        </motion.div>

        {!priceBreakdown ? (
          <SummarySkeleton />
        ) : (
          <>
            <div className="grid gap-3">
              <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-[#7C5CFF]/10 bg-white p-4">
                <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span>Print weight</span>
                  <span className="font-medium text-[#0F1B3D]">
                    {priceBreakdown.materialWeightGrams.toFixed(2)} g
                  </span>
                </div>
                <div className="mt-2 text-xs text-[#6F7192]">
                  Estimated total material usage for your selected {material.name} print
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-[#7C5CFF]/10 bg-white p-4">
                <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span>Estimated print time</span>
                  <span className="font-medium text-[#0F1B3D]">
                    {formatDurationMinutes(priceBreakdown.estimatedMinutes)}
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-[#6F7192]">
                  <Clock3 className="h-3.5 w-3.5" />
                  Based on weight, layer height, infill, post-processing, and quantity
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.015 }}
                className="rounded-[24px] border border-[#7C5CFF]/20 bg-[linear-gradient(180deg,rgba(124, 92, 255,0.12),rgba(124, 92, 255,0.06))] p-5 shadow-[0_12px_48px_rgba(124, 92, 255,0.1)]"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--brand-primary)]">Total Price</div>
                <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-[#0F1B3D]">
                  ₹{priceBreakdown.priceBeforeDiscount.toFixed(0)}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>Quantity</span>
                    <span>{priceBreakdown.quantity} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material cost</span>
                    <span>₹{priceBreakdown.materialCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Machine cost</span>
                    <span>₹{priceBreakdown.machineCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Post-processing</span>
                    <span>
                      {postProcessingOptions.find((option) => option.value === config.postProcessingLevel)?.label ?? 'None'} · ₹{priceBreakdown.postProcessingCharges.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-[#7C5CFF]/10 pt-2 mt-1 flex justify-between text-xs text-[#6F7192]">
                    <span>Subtotal</span>
                    <span>₹{priceBreakdown.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6F7192]">
                    <span>Overhead ({priceBreakdown.overheadPercentage}%)</span>
                    <span>₹{priceBreakdown.overheadAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6F7192]">
                    <span>Margin ({priceBreakdown.marginPercentage}%)</span>
                    <span>₹{priceBreakdown.marginAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6F7192]">
                    <span>Cart discount</span>
                    <span>{priceBreakdown.cartDiscountPercent}% · {priceBreakdown.cartDiscountAmount > 0 ? '-' : ''}₹{priceBreakdown.cartDiscountAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#7C5CFF]/10 pt-2 mt-1 flex justify-between font-medium text-[#0F1B3D]">
                    <span>Total price</span>
                    <span>₹{priceBreakdown.priceBeforeDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6F7192]">
                    <span>Final price</span>
                    <span>₹{priceBreakdown.finalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery charge</span>
                    <span>{priceBreakdown.deliveryCharge === 0 ? 'FREE' : `₹${priceBreakdown.deliveryCharge.toFixed(0)}`}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6F7192]">
                    <span>Grand total</span>
                    <span>₹{priceBreakdown.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6F7192]">
                    <span>Estimated print time</span>
                    <span>{formatDurationMinutes(priceBreakdown.estimatedMinutes)}</span>
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-2">
                <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-[#7C5CFF]/10 bg-white p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">
                    <Cuboid className="h-3.5 w-3.5" />
                    Dimensions
                  </div>
                  <div className="text-sm text-[#0F1B3D]">
                    {priceBreakdown.dimensionsMm.x.toFixed(1)} × {priceBreakdown.dimensionsMm.y.toFixed(1)} × {priceBreakdown.dimensionsMm.z.toFixed(1)} mm
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-emerald-400/15 bg-emerald-400/10 p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-700">
                    <Truck className="h-3.5 w-3.5" />
                    Delivery Window
                  </div>
                  <div className="text-sm font-medium text-[#0F1B3D]">Advertised under ~48 hour print and delivery</div>
                </motion.div>
              </div>
            </div>

            <div className="grid gap-3">
              <motion.button
                type="button"
                onClick={onAddToCart}
                disabled={!canOrder}
                whileHover={{ y: -2, scale: canOrder && !isInCart ? 1.01 : 1 }}
                whileTap={{ scale: canOrder && !isInCart ? 0.985 : 1 }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-[20px] px-5 py-4 text-sm font-semibold transition-all hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55 ${
                  isInCart
                    ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                    : 'bg-[#7C5CFF] text-white'
                }`}
              >
                {isInCart ? (
                  <>
                    Added to Cart
                    <PackageCheck className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Add to Cart
                    <ShoppingCart className="h-4 w-4" />
                  </>
                )}
              </motion.button>

              {isInCart && (
                <Link
                  href="/cart"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#7C5CFF]/30 bg-[#7C5CFF]/10 px-4 py-3 text-sm font-medium text-[#7C5CFF] transition-colors hover:bg-[#7C5CFF]/20"
                >
                  View Cart
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {!isSignedIn ? (
              <Link
                href="/login?next=%2Finstant-quote"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#7C5CFF]/10 bg-white px-4 py-3 text-sm font-medium text-[#0F1B3D] transition-colors hover:bg-[var(--bg-soft)]"
              >
                Sign in to save and order faster
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}

          </>
        )}
      </div>
    </motion.aside>
  )
}
