'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight, ArrowDown, MapPin, Clock, Sparkles } from 'lucide-react'
import { scrollToTarget } from '@/lib/scroll-to'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import ShopFeaturedAd from './ShopFeaturedAd'

function HeroFadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [prefersReducedMotion] = useState(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  return (
    <div
      className={prefersReducedMotion ? className ?? '' : `animate-fade-in ${className ?? ''}`}
      style={prefersReducedMotion || delay === 0 ? undefined : { animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  )
}

const stats = [
  { value: 1, prefix: '', suffix: '', label: 'Custom quote flow' },
  { value: 2, prefix: '', suffix: '', label: 'Order types' },
  { value: 3, prefix: '', suffix: '', label: 'Service categories' },
  { value: 4, prefix: '', suffix: '', label: 'Payment / support touchpoints' },
  { value: 5, prefix: '', suffix: '', label: 'Public policies' },
]

const heroBadges = [
  { label: 'Custom 3D printing', slug: 'custom-3d-printing' },
  { label: 'Prototyping', slug: 'prototyping' },
  { label: 'Model printing', slug: 'model-printing' },
  { label: 'Custom manufacturing', slug: 'business-and-bulk-orders' },
  { label: 'Ready-made products', slug: 'ready-made-products' },
  { label: 'Express production', slug: 'express-production' },
]

const atelierMetrics = [
  { label: 'Tolerance', value: '±0.2mm' },
  { label: 'Queue', value: 'Live' },
  { label: 'QC', value: 'Photo proof' },
]

function CountStat({ stat }: { stat: (typeof stats)[0] }) {
  const display = `${stat.prefix}${stat.value.toLocaleString('en-IN')}${stat.suffix}`

  return (
    <div className="stat-item premium-stat-item group relative">
      <span className="mx-auto mb-3 block h-1.5 w-1.5 rotate-45 rounded-sm bg-gradient-to-r from-violet-600 to-purple-500 opacity-80" />
      <div className="stat-number" suppressHydrationWarning>
        {display}
      </div>
      <div className="mx-auto mt-3 h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-violet-600 to-purple-400" />
      <div className="stat-label">{stat.label}</div>
    </div>
  )
}

export default function HeroSection({ featuredProducts }: { featuredProducts?: ShopPublicProduct[] }) {
  return (
    <section className="premium-hero relative overflow-hidden px-4 pb-8 pt-16 sm:px-6 sm:pt-20 md:pt-24 lg:px-10">
      <div className="premium-hero-media" aria-hidden="true">
        <Image
          src="/printer-poster.webp"
          alt=""
          fill
          quality={50}
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="premium-hero-poster"
          priority
        />
      </div>

      <div className="premium-hero-mobile-bg md:hidden" aria-hidden="true">
        <Image
          src="/printer-poster.webp"
          alt=""
          fill
          quality={65}
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-[center_15%]"
        />
      </div>

      <div className="premium-hero-surface" aria-hidden="true" />
      <div className="premium-hero-grid" aria-hidden="true" />
      <div className="premium-hero-beams" aria-hidden="true" />
      <div className="premium-corner-frame" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-col justify-center gap-8 py-4 md:min-h-[calc(88svh-7rem)] md:gap-10 md:py-6">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_470px]">
          <div className="min-w-0">
          <HeroFadeIn delay={0.2} className="max-w-5xl text-center lg:text-left">
            <div className="premium-hero-badge">
              <span className="premium-live-dot" />
              Flux3D custom manufacturing · India
            </div>
            <HeroFadeIn delay={0.3} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4c1d95]">
              <MapPin className="h-3.5 w-3.5" />
              Custom 3D printing and ready-made product delivery across India
            </HeroFadeIn>
          </HeroFadeIn>

          <h1 className="premium-hero-title text-[clamp(2.4rem,9vw,5rem)] font-black leading-[0.86] text-[#070b1d] sm:text-6xl md:text-7xl lg:text-8xl lg:text-left">
            <span className="premium-title-line block">
              <span className="premium-title-brand">Flux3D</span>
            </span>
            <span className="premium-title-line premium-title-service block">Custom 3D Printing &amp; Manufacturing</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#2e1065] sm:text-lg lg:mx-0 lg:leading-8">
            Flux 3D makes custom 3D-printed parts, prototypes, models and ready-made products for businesses and individuals who need a printed item with clear pricing, clear policies and a real support channel.
          </p>

          <HeroFadeIn delay={0.4} className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {heroBadges.map((badge) => (
              <span key={badge.label} className="premium-chip premium-chip-link">
                {badge.label}
              </span>
            ))}
          </HeroFadeIn>

          <HeroFadeIn delay={0.5} className="mx-auto mt-5 max-w-[620px] text-xs font-semibold uppercase tracking-[0.16em] text-[#5b21b6] lg:mx-0">
            Quote-based custom orders · Ready-made product pricing · India delivery
          </HeroFadeIn>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <Link
              href="/instant-quote"
              prefetch={false}
              className="premium-primary-cta group relative flex min-h-[56px] items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-center text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2"
            >
              <span className="relative z-10">Request a Quote</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              type="button"
              onClick={() => scrollToTarget('services')}
              className="premium-secondary-cta focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 flex min-h-[56px] min-w-[170px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-4 text-sm font-bold text-[#070b1d]"
            >
              Explore Services
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>

          <HeroFadeIn delay={0.7} className="mt-4 text-center text-xs font-medium text-[#5b21b6] lg:text-left">
            Custom orders reviewed before production · Support via email and phone · Tracked delivery where available
          </HeroFadeIn>

          <HeroFadeIn delay={0.75} className="premium-atelier-strip">
            {atelierMetrics.map((metric) => (
              <div key={metric.label} className="premium-atelier-metric">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </HeroFadeIn>
          </div>

          <HeroFadeIn delay={0.35} className="hidden lg:block">
            <ShopFeaturedAd products={featuredProducts ?? []} />
          </HeroFadeIn>
        </div>

        <HeroFadeIn delay={0.3} className="stats-row premium-stats-row">
          {stats.map((stat) => (
            <CountStat key={stat.label} stat={stat} />
          ))}
        </HeroFadeIn>

        <HeroFadeIn delay={0.85} className="mx-auto mt-5 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5b21b6]">
          <Clock className="h-3.5 w-3.5" />
          Production timelines shared before confirmation
          <Sparkles className="h-3.5 w-3.5 text-[#5b21b6]" />
        </HeroFadeIn>
      </div>
    </section>
  )
}
