'use client'

import Link from 'next/link'
import { memo, useRef } from 'react'
import { ArrowRight, Check, Clock3, IndianRupee, PackageCheck, ShieldCheck } from 'lucide-react'
import Reveal from '@/components/Reveal'

const pricingCards = [
  {
    title: 'Custom 3D Printing',
    subtitle: 'Quoted after file review',
    description: 'Upload a model or share a design brief and we confirm the final price after reviewing material, finish, quantity and delivery needs.',
    points: ['Production reviewed before payment confirmation', 'Suitable for prototypes and custom parts', 'No surprise finishing charges'],
  },
  {
    title: 'Ready-Made Products',
    subtitle: 'Price shown on the product page',
    description: 'Pre-designed, pre-printed products are listed with the price shown on the product page before checkout.',
    points: ['Direct purchase when listed', 'Shipping shown before payment', 'Payment verified on the server'],
  },
  {
    title: 'Shipping and Support',
    subtitle: 'Shared before dispatch',
    description: 'Shipping charges and delivery estimates are displayed before payment or included in the approved quotation.',
    points: ['India-only serviceable locations', 'Tracking shared when available', 'Contact support by email or phone'],
  },
]

function PricingSection() {
  const ref = useRef<HTMLElement>(null)

  return (
    <section ref={ref} className="relative overflow-hidden px-6 py-12 md:py-16 lg:py-24">
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-8 md:mb-12 lg:mb-16 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">Pricing</p>
            <h2 className="font-[var(--shop-font-heading)] text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.1] text-[var(--shop-text-primary,#1C1917)]">
              Clear pricing starts with a review of the real order.
            </h2>
            <p className="mx-auto mt-4 max-w-[700px] text-[var(--shop-text-muted,#78716C)] text-base">
              Flux3D quotes custom jobs after reviewing the file and service details. Ready-made products show their price before checkout. Nothing is hidden behind a fake placeholder price.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {pricingCards.map((card, index) => (
            <Reveal key={card.title} delay={index * 80}>
              <div className="rounded-[var(--shop-radius-lg,24px)] border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] p-6 shadow-[var(--shop-shadow-sm)] hover:border-[var(--shop-border-gold)] hover:shadow-[var(--shop-shadow-md)] transition-all">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint,#FAF6EB)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {card.subtitle}
                </div>
                <h3 className="font-[var(--shop-font-heading)] text-xl font-semibold text-[var(--shop-text-primary,#1C1917)]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--shop-text-secondary,#44403C)]">{card.description}</p>
                <ul className="mt-5 space-y-3">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-[var(--shop-text-secondary,#44403C)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--shop-gold,#C9A962)]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={260}>
          <div className="mt-6 md:mt-8 rounded-[var(--shop-radius-lg,24px)] border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint,#FAF6EB)] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <PackageCheck className="mt-1 h-5 w-5 text-[var(--shop-gold,#C9A962)]" />
                <p className="text-sm leading-7 text-[var(--shop-text-secondary,#44403C)]">
                  Before payment, customers can review the service type, price, taxes, shipping charge, refund policy, terms and support contact details.
                </p>
              </div>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary,#1C1917)] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--shop-gold,#C9A962)]">
                Request a quote
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--shop-text-muted,#78716C)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] px-3 py-2">
            <Clock3 className="h-3.5 w-3.5 text-[var(--shop-gold,#C9A962)]" />
            Timeline shared before confirmation
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--shop-gold,#C9A962)]" />
            Server-verified payment
          </span>
        </div>
      </div>
    </section>
  )
}

export default memo(PricingSection)
