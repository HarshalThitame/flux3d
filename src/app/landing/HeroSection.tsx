'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown, MapPin, Shield, Clock, Printer, Sparkles, Layers } from 'lucide-react'

const stats = [
  { value: 1, prefix: '', suffix: '', label: 'Custom quote flow' },
  { value: 2, prefix: '', suffix: '', label: 'Order types' },
  { value: 3, prefix: '', suffix: '', label: 'Service categories' },
  { value: 4, prefix: '', suffix: '', label: 'Payment / support touchpoints' },
  { value: 5, prefix: '', suffix: '', label: 'Public policies' },
]

const productionSignals = [
  { icon: Printer, label: 'Custom 3D printing', value: 'Parts, prototypes, and models' },
  { icon: Layers, label: 'Ready-made products', value: 'Pre-designed items for direct purchase' },
  { icon: Shield, label: 'Support and policy clarity', value: 'Transparent terms and contact details' },
]

const heroBadges = [
  'Custom 3D printing',
  'Prototyping',
  'Model printing',
  'Custom manufacturing',
  'Ready-made products',
]

const atelierMetrics = [
  { label: 'Tolerance', value: '±0.2mm' },
  { label: 'Queue', value: 'Live' },
  { label: 'QC', value: 'Photo proof' },
]

function CountStat({ stat }: { stat: typeof stats[0]; index: number }) {
  const display = `${stat.prefix}${stat.value.toLocaleString('en-IN')}${stat.suffix}`

  return (
    <div className="stat-item premium-stat-item group relative">
      <span className="mx-auto mb-3 block h-1.5 w-1.5 rotate-45 rounded-sm bg-gradient-to-r from-violet-600 to-purple-500 opacity-80" />
      <div className="stat-number" suppressHydrationWarning>{display}</div>
      <div className="mx-auto mt-3 h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-violet-600 to-purple-400 transition-transform duration-[1800ms] ease-out"
        style={{ transform: 'scaleX(1)' }} />
      <div className="stat-label">{stat.label}</div>
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="premium-hero relative overflow-hidden px-4 pb-8 pt-16 sm:px-6 sm:pt-20 md:pt-24 lg:px-10">
      <div className="premium-hero-media" aria-hidden="true">
        <Image src="/printer-poster.webp" alt="" fill quality={50} sizes="100vw" className="premium-hero-poster" />
      </div>

      <div className="premium-hero-mobile-bg md:hidden" aria-hidden="true">
        <Image src="/landing page 1.png" alt="" fill quality={75} sizes="100vw" className="object-cover object-[center_15%]" priority />
      </div>

      <div className="premium-hero-surface" aria-hidden="true" />
      <div className="premium-hero-grid" aria-hidden="true" />
      <div className="premium-hero-beams" aria-hidden="true" />
      <div className="premium-corner-frame" aria-hidden="true" />
      <div aria-hidden="true">
        <div className="premium-particle" />
        <div className="premium-particle" />
        <div className="premium-particle" />
        <div className="premium-particle" />
        <div className="premium-particle" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-0 md:min-h-[calc(88svh-7rem)] w-full max-w-7xl flex-col justify-center gap-8 py-4 md:gap-10 md:py-6">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_470px]">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-5 flex flex-col items-center gap-3 lg:items-start"
            >
              <div className="premium-hero-badge">
                <span className="premium-live-dot" />
                Flux3D custom manufacturing · India
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#374151]"
              >
                <MapPin className="h-3.5 w-3.5" />
                Custom 3D printing and ready-made product delivery across India
              </motion.p>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="premium-hero-title text-[clamp(2.4rem,9vw,5rem)] font-black leading-[0.86] text-[#0F1B3D] sm:text-6xl md:text-7xl lg:text-8xl"
            >
              <span className="premium-title-line premium-title-brand">Flux3D</span>
              <span className="premium-title-line premium-title-service">Custom 3D Printing &amp; Manufacturing</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#1a1a2e] sm:text-lg lg:mx-0 lg:leading-8"
            >
              Flux 3D makes custom 3D-printed parts, prototypes, models and ready-made products for businesses and individuals who need a printed item with clear pricing, clear policies and a real support channel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"
            >
              {heroBadges.map((badge) => (
                <span key={badge} className="premium-chip">{badge}</span>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mx-auto mt-5 max-w-[620px] text-xs font-semibold uppercase tracking-[0.16em] text-[#4b5563] lg:mx-0"
            >
              Quote-based custom orders · Ready-made product pricing · India delivery
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/instant-quote" prefetch={false}
                  className="premium-primary-cta group relative flex min-h-[56px] items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-center text-sm font-bold text-white">
                  <span className="relative z-10">Request a Quote</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <a href="#services"
                  className="premium-secondary-cta flex min-h-[56px] min-w-[170px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-4 text-sm font-bold text-[#0F1B3D]">
                  Explore Services
                  <ArrowDown className="h-4 w-4" />
                </a>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-4 text-center text-xs font-medium text-[#4b5563] lg:text-left"
            >
              Custom orders reviewed before production · Support via email and phone · Tracked delivery where available
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="premium-atelier-strip"
            >
              {atelierMetrics.map((metric) => (
                <div key={metric.label} className="premium-atelier-metric">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="premium-machine-panel">
              <div className="relative">
                <div className="premium-console-header">
                  <span>Production Command</span>
                  <strong>LIVE</strong>
                </div>
                <div className="premium-gantry-stage" aria-hidden="true">
                  <div className="premium-gantry-rail" />
                  <div className="premium-gantry-head"><span /></div>
                  <div className="premium-gantry-bed"><span /><span /><span /></div>
                </div>
                <div className="premium-machine-window">
                  <div className="premium-machine-scan" aria-hidden="true" />
                  <div className="premium-print-preview" aria-hidden="true">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span key={index} style={{ '--layer-y': `${(index - 4) * 9}px`, '--layer-width': `${78 - index * 4}px`, '--layer-delay': `${index * 90}ms` } as CSSProperties} />
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Current build</p>
                    <p className="mt-1 text-2xl font-black text-[#0F1B3D]">Functional PETG bracket</p>
                    <p className="mt-2 text-sm leading-6 text-[#6F7192]">Layer 1,286 of 1,920 · quality camera active</p>
                  </div>
                </div>
                <div className="premium-build-progress" aria-hidden="true"><span /></div>
                <div className="premium-material-rack">
                  {[
                    { label: 'PLA+', color: '#6d28d9' },
                    { label: 'PETG', color: '#059669' },
                    { label: 'Resin', color: '#7c3aed' },
                    { label: 'Nylon', color: '#d97706' },
                  ].map((material) => (
                    <div key={material.label}>
                      <span style={{ backgroundColor: material.color }} />
                      {material.label}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {productionSignals.map((signal, index) => (
                    <div key={signal.label} className="premium-signal-row" style={{ '--signal-index': index } as CSSProperties}>
                      <signal.icon className="h-4 w-4 text-[#6d28d9]" />
                      <span>{signal.label}</span>
                      <strong>{signal.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="stats-row premium-stats-row"
        >
          {stats.map((stat, i) => (
            <CountStat key={stat.label} stat={stat} index={i} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mx-auto mt-5 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4b5563]"
        >
          <Clock className="h-3.5 w-3.5" />
          Production timelines shared before confirmation
          <Sparkles className="h-3.5 w-3.5 text-[#6d28d9]" />
        </motion.div>
      </div>
    </section>
  )
}
