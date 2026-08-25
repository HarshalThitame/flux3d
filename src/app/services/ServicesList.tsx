import Link from 'next/link'
import {
  Building2,
  Clapperboard,
  Factory,
  Gift,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { serviceVerticals, type ServiceVertical } from '@/lib/services-content'
import Reveal from '@/components/Reveal'

const iconBySlug: Record<string, LucideIcon> = {
  'spare-parts-prototypes': Factory,
  'architecture-models': Building2,
  'student-projects': GraduationCap,
  'custom-products': ShoppingBag,
  'medical-dental-models': HeartPulse,
  'props-cosplay': Clapperboard,
  'corporate-gifting': Gift,
}

function ServiceCard({ service }: { service: ServiceVertical }) {
  const Icon = iconBySlug[service.slug] ?? Factory

  return (
    <article className="lux-card lux-card-gold-accent group relative flex h-full scroll-mt-24 flex-col p-7 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--lux-border-gold,#E5D9B8)] bg-[var(--lux-gold-faint,#FAF6EB)]">
          <Icon className="h-5 w-5 text-[var(--lux-gold)] transition-transform duration-300 group-hover:scale-110" />
        </span>
        <span className="rounded-full border border-[var(--lux-border-light,#E7E5E0)] bg-[var(--lux-bg-elevated,#FFFFFF)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lux-text-muted)]">
          {service.spec}
        </span>
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--lux-gold)]">
        {service.category}
      </p>
      <h3 className="lux-heading-3 mt-2 text-xl transition-colors duration-300 group-hover:text-[var(--lux-gold)]">
        {service.title}
      </h3>
      <p className="mt-3 flex-none text-sm leading-relaxed text-[var(--lux-text-secondary)]">
        {service.description}
      </p>

      <ul className="mt-5 space-y-2.5">
        {service.highlights.map((highlight) => (
          <li key={highlight} className="flex items-center gap-2.5 text-sm font-medium text-[var(--lux-text-secondary)]">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-4 w-4 shrink-0 text-[var(--lux-gold)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {highlight}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        <Link
          href="/instant-quote"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--lux-text-primary)] transition-colors hover:text-[var(--lux-gold)]"
        >
          Get instant quote
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  )
}

export default function ServicesList() {
  return (
    <section id="service-portfolio" className="lux-band-white relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)] lg:items-end">
            <div>
              <p className="lux-eyebrow mb-4">Service portfolio</p>
              <h2 className="lux-heading-2 max-w-2xl">
                Every print category, one production discipline.
              </h2>
            </div>
            <p className="text-sm leading-7 text-[var(--lux-text-muted)]">
              Choose a specialization or upload your file directly — the workflow stays the same: material
              fit, print strategy, finishing plan, QC, and dispatch.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {serviceVerticals.map((service, index) => (
            <Reveal key={service.slug} delay={index * 60}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
