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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_30%,rgba(91,33,182,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-8 md:mb-12 lg:mb-16 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-normal text-[#5b21b6]">Pricing</p>
            <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.1] text-[#4c1d95]">
              Clear pricing starts with a review of the real order.
            </h2>
            <p className="mx-auto mt-4 max-w-[700px] text-[#5b21b6]">
              Flux 3D quotes custom jobs after reviewing the file and service details. Ready-made products show their price before checkout. Nothing is hidden behind a fake placeholder price.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {pricingCards.map((card, index) => (
            <Reveal key={card.title} delay={index * 80}>
              <div className="rounded-2xl border border-[#5b21b6]/12 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#5b21b6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5b21b6]">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {card.subtitle}
                </div>
                <h3 className="text-xl font-bold text-[#4c1d95]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5b21b6]">{card.description}</p>
                <ul className="mt-5 space-y-3">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-[#5b21b6]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={260}>
          <div className="mt-6 md:mt-8 rounded-2xl border border-[#5b21b6]/12 bg-[#faf9f7] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <PackageCheck className="mt-1 h-5 w-5 text-[#5b21b6]" />
                <p className="text-sm leading-7 text-[#5b21b6]">
                  Before payment, customers can review the service type, price, taxes, shipping charge, refund policy, terms and support contact details.
                </p>
              </div>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#5b21b6] px-5 text-sm font-semibold text-white">
                Request a quote
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.16em] text-[#5b21b6]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dff5] bg-white px-3 py-2">
            <Clock3 className="h-3.5 w-3.5 text-[#5b21b6]" />
            Timeline shared before confirmation
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dff5] bg-white px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#5b21b6]" />
            Server-verified payment
          </span>
        </div>
      </div>
    </section>
  )
}

export default memo(PricingSection)
