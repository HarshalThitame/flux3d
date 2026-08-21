'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { Upload, MessageSquare, CreditCard, Printer, Package, ArrowRight, ChevronRight } from 'lucide-react'
import Reveal from '@/components/Reveal'

const steps = [
  {
    icon: Upload,
    step: '01',
    title: 'Share Your Requirement',
    description: 'Upload a design file or describe the part, product or model you need. We review the request before confirming the order.',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: 'Receive a Quotation',
    description: 'We confirm the material, colour, quantity, finish, shipping and production details, then send the final price or quote.',
  },
  {
    icon: CreditCard,
    step: '03',
    title: 'Pay Securely Online',
    description: 'Payments are handled through the checkout flow with server-side verification before an order is marked paid.',
  },
  {
    icon: Printer,
    step: '04',
    title: 'Production and QC',
    description: 'The order is manufactured, checked, and prepared for dispatch after the final approved specifications are locked in.',
  },
  {
    icon: Package,
    step: '05',
    title: 'Delivered to You',
    description: 'The completed order is shipped to a serviceable location in India. Tracking is shared when available.',
  },
]

function HowItWorksSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    if (hoveredIndex !== null) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [hoveredIndex])

  return (
    <section className="relative py-16 px-4 md:py-20 lg:py-28 overflow-hidden">
      <div className="max-w-[1200px] mx-auto relative z-10">
        <Reveal>
          <div className="text-center mb-10 md:mb-14 lg:mb-18 relative">
            <p className="text-xs font-bold text-[var(--shop-gold,#C9A962)] uppercase tracking-[0.14em] mb-3">The Process</p>
            <h2 className="font-[var(--shop-font-heading)] text-[clamp(1.8rem,4vw,3rem)] font-semibold text-[var(--shop-text-primary,#1C1917)] leading-[1.15]">
              From Requirement to Dispatch{' '}
              <span className="text-[var(--shop-gold,#C9A962)]">
                in 5 Steps.
              </span>
            </h2>
          </div>
        </Reveal>

        {/* Mobile: Horizontal Carousel */}
        <div className="md:hidden">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide"
            ref={scrollRef}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {steps.map((step, i) => (
              <div key={i} className="snap-center shrink-0 w-[88vw] max-w-[380px]">
                <Reveal delay={i * 0.08}>
                  <div className="relative group h-full">
                    <div className="relative bg-[var(--shop-bg-elevated,#FFFFFF)] rounded-[var(--shop-radius-lg,20px)] p-5 border border-[var(--shop-border-light,#E7E5E0)] shadow-[var(--shop-shadow-sm)] h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative w-11 h-11 rounded-xl bg-[var(--shop-gold-faint,#FAF6EB)] border border-[var(--shop-border-gold)] flex items-center justify-center shrink-0">
                          <step.icon className="w-5 h-5 text-[var(--shop-gold,#C9A962)]" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--shop-gold,#C9A962)]">
                            Step {step.step}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--shop-text-subtle)]" />
                        </div>
                      </div>

                      <h3 className="font-[var(--shop-font-heading)] text-lg font-semibold text-[var(--shop-text-primary,#1C1917)] mb-2 leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-sm text-[var(--shop-text-secondary,#44403C)] leading-[1.7] flex-1">
                        {step.description}
                      </p>
                      <div className="mt-4 h-0.5 w-10 rounded-full bg-[var(--shop-gold,#C9A962)]" />
                    </div>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>

          <div className="flex justify-center items-center gap-2 mt-4">
            {steps.map((_, i) => {
              const isActive = i === activeIndex
              return (
                <button
                  key={i}
                  onClick={() => {
                    const container = scrollRef.current
                    if (container) {
                      const card = container.children[i] as HTMLElement
                      if (card) {
                        container.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' })
                      }
                    }
                    setActiveIndex(i)
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    isActive
                      ? 'w-8 h-2 bg-[var(--shop-gold,#C9A962)]'
                      : 'w-2 h-2 bg-[var(--shop-border-medium)]'
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              )
            })}
          </div>
        </div>

        {/* Desktop: Timeline */}
        <div className="hidden md:block relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[var(--shop-border-gold)]" />

          <div className="relative space-y-12 lg:space-y-16">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0
              const isHovered = hoveredIndex === i
              const isDimmed = hoveredIndex !== null && !isHovered

              return (
                <div
                  key={i}
                  className={`relative flex items-center ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} group`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <Reveal delay={0.15 + i * 0.1}>
                    <div
                      className={`w-full lg:w-[calc(50%-48px)] ${isLeft ? 'lg:pr-8' : 'lg:pl-8'}`}
                    >
                      <div
                        className={`relative overflow-hidden rounded-[var(--shop-radius-lg,24px)] border transition-all duration-300 ${
                          isHovered
                            ? 'border-[var(--shop-gold,#C9A962)] shadow-[var(--shop-shadow-md)]'
                            : 'border-[var(--shop-border-light,#E7E5E0)] shadow-[var(--shop-shadow-sm)]'
                        } bg-[var(--shop-bg-elevated,#FFFFFF)] p-6 lg:p-8`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`relative w-14 h-14 rounded-2xl bg-[var(--shop-gold-faint,#FAF6EB)] border border-[var(--shop-border-gold)] flex items-center justify-center transition-transform duration-300 ${isDimmed ? 'opacity-55' : ''} group-hover:scale-105 shrink-0`}>
                            <step.icon className="w-7 h-7 text-[var(--shop-gold,#C9A962)]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shop-gold,#C9A962)]">
                              Step {step.step}
                            </span>
                            <ChevronRight className="w-4 h-4 text-[var(--shop-text-subtle)] mt-0.5" />
                          </div>
                        </div>

                        <h3 className="font-[var(--shop-font-heading)] text-xl lg:text-2xl font-semibold text-[var(--shop-text-primary,#1C1917)] mb-3 leading-snug">
                          {step.title}
                        </h3>
                        <p className="text-sm lg:text-[15px] text-[var(--shop-text-secondary,#44403C)] leading-[1.7] max-w-md">
                          {step.description}
                        </p>
                        <div className="mt-5 h-0.5 w-12 rounded-full bg-[var(--shop-gold,#C9A962)] transition-all duration-300 group-hover:w-20" />
                      </div>
                    </div>
                  </Reveal>

                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                    <div
                      className={`relative w-10 h-10 rounded-full bg-[var(--shop-bg-elevated,#FFFFFF)] border-2 flex items-center justify-center shadow-md transition-all duration-300 ${
                        isHovered
                          ? 'border-[var(--shop-gold,#C9A962)] scale-110'
                          : 'border-[var(--shop-border-medium)]'
                      } ${isDimmed ? 'opacity-55' : ''}`}
                    >
                      <span className="text-xs font-bold text-[var(--shop-gold,#C9A962)]">
                        {step.step}
                      </span>
                    </div>
                  </div>

                  <div className="hidden lg:block w-[calc(50%-48px)]" />
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <Reveal>
          <div className="text-center mt-12 md:mt-16">
            <p className="font-[var(--shop-font-heading)] text-xl lg:text-2xl font-semibold text-[var(--shop-text-primary,#1C1917)] mb-5">Ready to start?</p>
            <a href="/contact" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--shop-text-primary,#1C1917)] px-8 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-gold,#C9A962)]">
              Request a Quote
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--shop-text-muted,#78716C)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--shop-gold,#C9A962)]" />
                Timeline shared before confirmation
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--shop-gold,#C9A962)]" />
                Quality checked before dispatch
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--shop-gold,#C9A962)]" />
                Support via email &amp; phone
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default memo(HowItWorksSection)

export const _exports = { steps }
