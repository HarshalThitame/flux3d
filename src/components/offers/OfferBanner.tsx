'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Gift, ChevronRight, Percent } from 'lucide-react'
import Link from 'next/link'
import CountdownTimer from './CountdownTimer'

type Offer = {
  id: string
  title: string
  description: string | null
  banner_url: string | null
  offer_type: string
  discount_value: number
  badge_text: string | null
  badge_color: string
  sale_label: string | null
  ends_at: string
  is_featured: boolean
  coupon_code: string | null
  min_order_value: number
}

export function AnnouncementBar() {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/offers/active')
      .then(r => r.json())
      .then(d => {
        const featured = d.offers?.find((o: Offer) => o.is_featured) ?? d.offers?.[0]
        if (featured) setOffer(featured)
      })
      .catch(() => {})
  }, [])

  if (!offer || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative bg-gradient-to-r from-[#4A32B0] via-[#5B3FD6] to-[#6B4FE0] overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-[1400px] mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-white text-sm">
          <Gift className="w-4 h-4 flex-shrink-0 hidden sm:block" />
          <span className="font-medium min-w-0">
            {offer.badge_text && (
              <span className="inline-block bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold mr-2 uppercase">
                {offer.badge_text}
              </span>
            )}
            {offer.sale_label && (
              <span className="font-bold mr-1">{offer.sale_label}</span>
            )}
            {offer.title}
          </span>
          <CountdownTimer targetDate={offer.ends_at} size="sm" light className="flex-shrink-0" />
          <Link
            href="/instant-quote"
            className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 transition-colors flex-shrink-0"
          >
            Grab Deal
            <ChevronRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss offer banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export function OfferBanner() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    fetch('/api/offers/active')
      .then(r => r.json())
      .then(d => {
        const featured = d.offers?.filter((o: Offer) => o.is_featured) ?? []
        if (featured.length > 0) setOffers(featured)
      })
      .catch(() => {})
  }, [])

  if (offers.length === 0) return null

  const offer = offers[current]

  return (
    <div className="relative min-h-[200px] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--gradient-soft)] shadow-[var(--shadow-md)] sm:min-h-[260px]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_50%,rgba(109,40,217,0.14),transparent_60%),radial-gradient(ellipse_40%_40%_at_70%_30%,rgba(8,145,178,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.72),transparent_40%)]" />

      <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex-1">
          {offer.badge_text && (
            <span className="inline-block bg-gradient-to-r from-[#5B3FD6] to-[#8B5CF6] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              {offer.badge_text}
            </span>
          )}
          <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">
            {offer.title}
          </h3>
          {offer.description && (
            <p className="mb-4 max-w-[500px] text-sm text-[var(--text-secondary)]">
              {offer.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {offer.sale_label && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-faint)] px-3 py-1 text-sm font-semibold text-[var(--brand-primary)]">
                <Percent className="w-3.5 h-3.5" />
                {offer.sale_label}
              </span>
            )}
            <CountdownTimer targetDate={offer.ends_at} size="sm" />
            <Link
              href="/instant-quote"
              className="inline-flex items-center gap-2 bg-[#5B3FD6] hover:bg-[#4A32B0] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-[0_0_30px_rgba(91,63,214,0.4)]"
            >
              Shop Now
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {offer.coupon_code && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border-brand)] bg-white/80 px-3 py-1.5">
              <span className="text-xs text-[var(--text-muted)]">Use code:</span>
              <code className="font-mono text-sm font-bold text-[var(--brand-primary)]">{offer.coupon_code}</code>
            </div>
          )}
        </div>
      </div>

      {offers.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {offers.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? 'w-6 bg-[var(--brand-primary)]' : 'bg-[var(--border-medium)] hover:bg-[var(--brand-light)]/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SaleBadge({ label, className = '' }: { label?: string; className?: string }) {
  if (!label) return null
  return (
    <span
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-[#5B3FD6] to-[#8B5CF6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${className}`}
    >
      <Gift className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}
