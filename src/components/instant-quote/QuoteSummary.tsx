'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Clock3, IndianRupee, PackageCheck, Scale, Sparkles, Truck } from 'lucide-react'
import { getMaterialById } from '@/lib/quote/materials'
import type { PriceBreakdown } from '@/lib/quote/types'

type QuoteSummaryProps = {
  materialId: string
  quoteId: string
  priceBreakdown: PriceBreakdown | null
  isSignedIn: boolean
  canOrder: boolean
  isSubmittingOrder: boolean
  orderNotes: string
  deliveryCharge: number
  totalPrice: number
  onOrderNotesChange: (value: string) => void
  onOrderPrint: () => void
}

function SummarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
    </div>
  )
}

export default function QuoteSummary({
  materialId,
  quoteId,
  priceBreakdown,
  isSignedIn,
  canOrder,
  isSubmittingOrder,
  orderNotes,
  deliveryCharge,
  totalPrice,
  onOrderNotesChange,
  onOrderPrint,
}: QuoteSummaryProps) {
  const material = getMaterialById(materialId)

  return (
    <motion.aside
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.98),rgba(6,10,20,0.96))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.3)]"
    >
      <motion.div
        aria-hidden
        animate={{ x: [0, 18, 0], y: [0, -10, 0], opacity: [0.24, 0.4, 0.24] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-10 top-14 h-40 w-40 rounded-full bg-[#FF5C1A]/10 blur-3xl"
      />
      <div className="lg:sticky lg:top-24">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
              Price & Quotation
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#97a1c2]">
              Your live estimate updates instantly so you can make smarter decisions without second-guessing the print.
            </p>
          </div>
          <div className="rounded-2xl border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 p-3 text-[#FF9A72]">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        <motion.div
          animate={{ boxShadow: ['0 0 0 rgba(255,92,26,0)', '0 0 36px rgba(255,92,26,0.08)', '0 0 0 rgba(255,92,26,0)'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-4 rounded-[22px] border border-[#FF5C1A]/15 bg-[radial-gradient(circle_at_top,rgba(255,92,26,0.18),transparent_48%),rgba(255,255,255,0.03)] p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Quote Session</div>
          <div className="mt-2 text-xl font-semibold text-white">{quoteId}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#d6dcf2]">
            <Sparkles className="h-3.5 w-3.5 text-[#FF9A72]" />
            {material.name}
          </div>
        </motion.div>

        {!priceBreakdown ? (
          <SummarySkeleton />
        ) : (
          <>
            <div className="grid gap-3">
              <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-sm text-[#aeb8d8]">
                  <span>Print weight</span>
                  <span className="font-medium text-white">
                    {priceBreakdown.materialWeightGrams.toFixed(1)} g
                  </span>
                </div>
                <div className="mt-2 text-xs text-[#7a82a0]">
                  Estimated usage for your selected {material.name} print
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-sm text-[#aeb8d8]">
                  <span>Estimated print time</span>
                  <span className="font-medium text-white">
                    {priceBreakdown.estimatedHours.toFixed(1)} hr
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-[#7a82a0]">
                  <Clock3 className="h-3.5 w-3.5" />
                  Calculated from geometry, layer height, infill, and part complexity
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.015 }}
                className="rounded-[24px] border border-[#FF8A57]/20 bg-[linear-gradient(180deg,rgba(255,92,26,0.12),rgba(255,92,26,0.06))] p-5 shadow-[0_12px_48px_rgba(255,92,26,0.1)]"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#ffd3c1]">Total Price</div>
                <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-white">
                  ₹{totalPrice.toFixed(0)}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#ffe0d4]">
                  <div className="flex justify-between">
                    <span>Print cost</span>
                    <span>₹{priceBreakdown.total.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery charge</span>
                    <span>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(0)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Setup</span>
                    <span>₹{priceBreakdown.setupCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Supports</span>
                    <span>₹{priceBreakdown.supportCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated print time</span>
                    <span>{priceBreakdown.estimatedHours.toFixed(1)} hr</span>
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-2">
                <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">
                    <Scale className="h-3.5 w-3.5" />
                    Scaled Dimensions
                  </div>
                  <div className="text-sm text-white">
                    {priceBreakdown.dimensionsMm.x.toFixed(1)} × {priceBreakdown.dimensionsMm.y.toFixed(1)} × {priceBreakdown.dimensionsMm.z.toFixed(1)} mm
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="rounded-[20px] border border-emerald-400/15 bg-emerald-400/10 p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-200">
                    <Truck className="h-3.5 w-3.5" />
                    Delivery Window
                  </div>
                  <div className="text-sm font-medium text-white">Advertised under ~48 hour print and delivery</div>
                </motion.div>
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <label className="block text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">
                Notes for admin
              </label>
              <textarea
                value={orderNotes}
                onChange={(event) => onOrderNotesChange(event.target.value)}
                rows={4}
                placeholder="Add special instructions, deadlines, or finishing requests."
                className="mt-3 w-full rounded-[18px] border border-white/10 bg-[#0d1120] px-4 py-3 text-sm text-white outline-none transition focus:border-[#FF5C1A]/40"
              />
            </div>

            <motion.button
              type="button"
              onClick={onOrderPrint}
              disabled={!canOrder || isSubmittingOrder}
              whileHover={{ y: -2, scale: canOrder && !isSubmittingOrder ? 1.01 : 1 }}
              whileTap={{ scale: canOrder && !isSubmittingOrder ? 0.985 : 1 }}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#FF5C1A] px-5 py-4 text-sm font-semibold text-white transition-all hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmittingOrder ? 'Preparing Delivery Step...' : 'Continue to Delivery'}
              <PackageCheck className="h-4 w-4" />
            </motion.button>

            {!isSignedIn ? (
              <Link
                href="/login?next=%2Finstant-quote"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
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
