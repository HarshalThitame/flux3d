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
      className={`group relative scroll-mt-24 bg-[#faf9f7] border border-[rgba(109,40,217,0.5)] rounded-2xl overflow-hidden transition-all duration-300 hover:border-[rgba(109,40,217,0.3)] hover:shadow-[0_8px_40px_rgba(109,40,217,0.08)] hover:-translate-y-1.5 flex flex-col ${
        service.span ? 'md:col-span-2' : ''
      } ${highlighted ? 'ring-2 ring-[#a855f7] ring-offset-2 ring-offset-[#f9f7f4] shadow-[0_0_0_1px_rgba(168,85,247,0.35),0_8px_40px_rgba(168,85,247,0.22)]' : ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
      <div className="relative z-10 p-5 sm:p-6 md:p-8 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-4">
          <div className={`inline-flex items-center bg-gradient-to-r ${service.color} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
            {service.tag}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${service.color} p-0.5 flex-shrink-0`}>
            <div className="w-full h-full rounded-xl bg-[#faf9f7] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <service.icon className="w-7 h-7 text-[#4c1d95]" />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="font-[var(--font-syne)] text-lg sm:text-xl font-bold text-[#4c1d95] mb-2 group-hover:text-[#5b21b6] transition-colors duration-300">
              {service.title}
            </h3>
            <p className="text-sm text-[#5b21b6] leading-[1.6] mb-3 sm:mb-4 flex-1">
              {service.description}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {service.pills.map((pill, j) => (
                <span
                  key={j}
                  className="text-[11px] sm:text-xs bg-[rgba(91,33,182,0.08)] text-[#4c1d95] px-3 py-1 rounded-full border border-[rgba(91,33,182,0.14)]"
                >
                  {pill}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[rgba(91,33,182,0.10)]">
              <span className="text-sm text-[#5b21b6] font-semibold">{service.price}</span>
              <a
                href={service.link || '/instant-quote'}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4c1d95] hover:text-[#5b21b6] transition-colors group/link min-h-[44px]"
              >
                {service.cta}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-full`} />
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(91,33,182,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        <Reveal>
          <div className="text-center mb-8 md:mb-12 lg:mb-16 relative z-10">
            <span className="premium-section-number">01</span>
            <p className="text-sm font-medium text-[#5b21b6] uppercase tracking-normal mb-4">What We Print</p>
            <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#4c1d95] tracking-normal leading-[1.1]">
              One Service.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5b21b6] to-[#a855f7]">
                Every Industry.
              </span>
            </h2>
            <p className="text-[#6F7192] mt-4 max-w-[600px] mx-auto">
              Flux 3D handles one-off custom parts, small batch production and ready-made products using a review-and-confirm workflow.
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
          <div className="text-center bg-[#faf9f7] border border-[rgba(91,33,182,0.12)] rounded-2xl p-8 hover:border-[rgba(91,33,182,0.20)] transition-colors duration-300">
            <p className="text-lg text-[#4c1d95] mb-2">Don&apos;t see your requirement above?</p>
            <p className="text-sm text-[#5b21b6] mb-6">Share your file or product requirement and we&apos;ll review it before confirming the order.</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-[#5b21b6] text-white px-6 py-3 rounded-xl text-sm font-medium hover:shadow-[0_0_30px_rgba(91,33,182,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
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
