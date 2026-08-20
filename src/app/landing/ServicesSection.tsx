'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { Settings as Gear, Building2, GraduationCap, ShoppingBag, Heart, Clapperboard, Gift, ArrowRight } from 'lucide-react'
import Reveal from '@/components/Reveal'
import { getScrollTargetEventName } from '@/lib/scroll-to'

const services = [
  {
    slug: 'custom-3d-printing',
    icon: Gear,
    tag: 'Custom Printing',
    title: 'Custom 3D Printing',
    description: 'Upload a model or share your requirements and we review the file, material, colour, quantity and finish before confirming the order.',
    pills: ['3D models', 'Prototypes', 'Functional parts', 'Custom finishes'],
    price: 'Quoted per order',
    cta: 'Request Quote →',
    color: 'from-[#6d28d9] to-[#a855f7]',
    span: true,
  },
  {
    slug: 'model-printing',
    icon: Building2,
    tag: 'Model Printing',
    title: 'Architectural and Presentation Models',
    description: 'Useful for product mockups, architecture models, classroom submissions and presentation pieces that need a physical form.',
    pills: ['Architecture', 'Display models', 'Mockups', 'Submission pieces'],
    price: 'Quoted per model',
    cta: 'Share Your File →',
    color: 'from-[#a855f7] to-[#a855f7]',
  },
  {
    slug: 'ready-made-products',
    icon: GraduationCap,
    tag: 'Ready-made',
    title: 'Ready-Made Products',
    description: 'Pre-designed, pre-printed products available for direct purchase where the catalogue lists them.',
    pills: ['Direct purchase', 'Gift items', 'Desk accessories', 'Home items'],
    price: 'As listed',
    cta: 'Browse Catalogue →',
    link: '/3d-shop',
    color: 'from-[#6d28d9] to-[#6d28d9]',
  },
  {
    slug: 'finishing',
    icon: ShoppingBag,
    tag: 'Finishing',
    title: 'Finishing and Post-Processing',
    description: 'Support for sanding, cleaning, assembly and other finishing steps when selected and approved for the order.',
    pills: ['Sanding', 'Assembly', 'Cleaning', 'Finishing'],
    price: 'By quote',
    cta: 'Discuss Finish →',
    color: 'from-[#a855f7] to-[#a855f7]',
  },
  {
    slug: 'business-and-bulk-orders',
    icon: Heart,
    tag: 'Business',
    title: 'Business and Bulk Orders',
    description: 'Suitable for organizations that need repeated parts, branded pieces or multi-quantity print runs with quotation-based pricing.',
    pills: ['Batches', 'Branding', 'Repeat orders', 'Bulk pricing'],
    price: 'Custom quote',
    cta: 'Request Bulk Quote →',
    color: 'from-[#fb7185] to-[#6d28d9]',
  },
  {
    slug: 'design-review',
    icon: Clapperboard,
    tag: 'Support',
    title: 'Design Review and File Checks',
    description: 'If a design looks unsuitable for printing, we can review the file, suggest changes, place the order on hold, or decline it when needed.',
    pills: ['File review', 'Dimension check', 'Revision notes', 'Order hold'],
    price: 'Included in quote',
    cta: 'Ask for Review →',
    color: 'from-[#a855f7] to-[#6d28d9]',
  },
  {
    slug: 'dispatch-delivery',
    icon: Gift,
    tag: 'Delivery',
    title: 'Dispatch and Delivery',
    description: 'Orders are shipped after production and quality checks, with tracking shared when the courier provides it.',
    pills: ['Tracked shipping', 'India delivery', 'Courier handoff', 'Delivery support'],
    price: 'Shipping quoted separately',
    cta: 'Read Delivery Policy →',
    color: 'from-[#0f766e] to-[#14b8a6]',
  },
]

function ServiceCard({ service, highlighted }: { service: typeof services[0]; highlighted: boolean }) {
  return (
    <div
      id={service.slug}
      className={`group relative scroll-mt-24 bg-[var(--shop-bg-elevated,#FFFFFF)] border border-[var(--shop-border-light,#E7E5E0)] rounded-[var(--shop-radius-lg,24px)] overflow-hidden transition-all duration-300 hover:border-[var(--shop-gold,#C9A962)] hover:shadow-[var(--shop-shadow-md)] hover:-translate-y-1.5 flex flex-col ${
        service.span ? 'md:col-span-2' : ''
      } ${highlighted ? 'ring-2 ring-[var(--shop-gold,#C9A962)] ring-offset-2 ring-offset-[#FDFCF8] shadow-[var(--shop-shadow-lg)]' : ''}`}
    >
      <div className="bento-card-shimmer" />
      <div className="relative z-10 p-6 md:p-8 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center bg-[var(--shop-gold-faint,#FAF6EB)] text-[var(--shop-gold,#C9A962)] border border-[var(--shop-border-gold)] text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full">
            {service.tag}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--shop-gold-faint,#FAF6EB)] border border-[var(--shop-border-gold)] p-0.5 flex-shrink-0 flex items-center justify-center">
            <service.icon className="w-6 h-6 text-[var(--shop-gold,#C9A962)] group-hover:scale-110 transition-transform duration-300" />
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="font-[var(--shop-font-heading)] text-xl font-semibold text-[var(--shop-text-primary,#1C1917)] mb-2 group-hover:text-[var(--shop-gold,#C9A962)] transition-colors duration-300">
              {service.title}
            </h3>
            <p className="text-sm text-[var(--shop-text-secondary,#44403C)] leading-[1.6] mb-4 flex-1">
              {service.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {service.pills.map((pill, j) => (
                <span
                  key={j}
                  className="text-xs bg-[var(--shop-bg-muted,#F2F0EA)] text-[var(--shop-text-muted,#78716C)] px-3 py-1 rounded-full border border-[var(--shop-border-light,#E7E5E0)] font-medium"
                >
                  {pill}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--shop-border-light,#E7E5E0)]">
              <span className="text-sm text-[var(--shop-gold,#C9A962)] font-semibold">{service.price}</span>
              <a
                href={service.link || '/instant-quote'}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--shop-text-primary,#1C1917)] hover:text-[var(--shop-gold,#C9A962)] transition-colors group/link min-h-[44px]"
              >
                {service.cta}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ServicesSection() {
  const highlightRef = useRef<HTMLDivElement | null>(null)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [timer, setTimer] = useState<number | null>(null)

  useEffect(() => {
    const flash = (id: string) => {
      if (!services.some((service) => service.slug === id)) return
      setHighlighted(id)
      if (timer) window.clearTimeout(timer)
      const t = window.setTimeout(() => setHighlighted(null), 2000)
      setTimer(t)
    }

    const initialHash = window.location.hash.replace(/^#/, '')
    if (initialHash) flash(initialHash)

    const eventName = getScrollTargetEventName()
    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail
      if (detail?.id) flash(detail.id)
    }

    window.addEventListener(eventName, handleEvent)
    return () => {
      window.removeEventListener(eventName, handleEvent)
      if (timer) window.clearTimeout(timer)
    }
  }, [timer])

  return (
    <section id="services" ref={highlightRef} className="relative scroll-mt-20 overflow-hidden px-6 py-12 md:py-16 lg:py-24">
      <div className="max-w-[1200px] mx-auto relative z-10">
        <Reveal>
          <div className="text-center mb-8 md:mb-12 lg:mb-16 relative z-10">
            <p className="text-xs font-bold text-[var(--shop-gold,#C9A962)] uppercase tracking-[0.14em] mb-3">What We Print</p>
            <h2 className="font-[var(--shop-font-heading)] text-[clamp(2rem,4vw,3.2rem)] font-semibold text-[var(--shop-text-primary,#1C1917)] leading-[1.1]">
              One Service.{' '}
              <span className="text-[var(--shop-gold,#C9A962)]">
                Every Industry.
              </span>
            </h2>
            <p className="text-[var(--shop-text-muted,#78716C)] mt-4 max-w-[600px] mx-auto text-base">
              Flux3D handles one-off custom parts, small batch production and ready-made products using a review-and-confirm workflow.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {services.map((service, i) => (
            <Reveal key={i} delay={i * 60}>
              <ServiceCard service={service} highlighted={highlighted === service.slug} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={services.length * 60 + 60}>
          <div className="text-center bg-[var(--shop-bg-elevated,#FFFFFF)] border border-[var(--shop-border-gold)] rounded-[var(--shop-radius-xl,32px)] p-8 shadow-[var(--shop-shadow-sm)]">
            <p className="font-[var(--shop-font-heading)] text-xl font-semibold text-[var(--shop-text-primary,#1C1917)] mb-2">Don&apos;t see your requirement above?</p>
            <p className="text-sm text-[var(--shop-text-muted,#78716C)] mb-6">Share your file or product requirement and we&apos;ll review it before confirming the order.</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-[var(--shop-text-primary,#1C1917)] text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[var(--shop-gold,#C9A962)] transition-colors duration-300"
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default memo(ServicesSection)
