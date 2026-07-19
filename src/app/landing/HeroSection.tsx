import Link from 'next/link'
import Image from 'next/image'
import type { CSSProperties } from 'react'
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
    <section className="premium-hero relative overflow-hidden px-4 pb-8 pt-28 sm:px-6 md:pt-32 lg:px-10">
      <div className="premium-hero-media" aria-hidden="true">
        <Image src="/printer-poster.webp" alt="" fill quality={50} sizes="100vw" className="premium-hero-poster" />
      </div>

      <div className="premium-hero-surface" aria-hidden="true" />
      <div className="premium-hero-grid" aria-hidden="true" />
      <div className="premium-hero-beams" aria-hidden="true" />
      <div className="premium-corner-frame" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[calc(88svh-7rem)] w-full max-w-7xl flex-col justify-center gap-10 py-6">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_470px]">
          <div className="max-w-5xl text-center lg:text-left">
            <div className="mb-5 flex flex-col items-center gap-3 lg:items-start">
              <div className="premium-hero-badge">
                <span className="premium-live-dot" />
                Flux3D custom manufacturing · India
              </div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6F7192]">
                <MapPin className="h-3.5 w-3.5" />
                Custom 3D printing and ready-made product delivery across India
              </p>
            </div>

            <h1 className="premium-hero-title text-5xl font-black leading-[0.86] text-[#0F1B3D] sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="premium-title-line premium-title-brand">Flux3D</span>
              <span className="premium-title-line premium-title-service">Custom 3D Printing &amp; Manufacturing</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#6F7192] sm:text-lg lg:mx-0">
              Flux 3D makes custom 3D-printed parts, prototypes, models and ready-made products for businesses and individuals who need a printed item with clear pricing, clear policies and a real support channel.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {heroBadges.map((badge) => (
                <span key={badge} className="premium-chip">{badge}</span>
              ))}
            </div>

            <p className="mx-auto mt-5 max-w-[620px] text-xs font-semibold uppercase tracking-[0.16em] text-[#9ca3af] lg:mx-0">
              Quote-based custom orders · Ready-made product pricing · India delivery
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <div>
                <Link href="/instant-quote" prefetch={false}
                  className="premium-primary-cta group relative flex min-h-[56px] items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-center text-sm font-bold text-white transition-all duration-300">
                  <span className="relative z-10">Request a Quote</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div>
                <a href="#services"
                  className="premium-secondary-cta flex min-h-[56px] min-w-[170px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-4 text-sm font-bold text-[#0F1B3D] transition-all duration-200">
                  Explore Services
                  <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-[#9ca3af] lg:text-left">
              Custom orders reviewed before production · Support via email and phone · Tracked delivery where available
            </p>

            <div className="premium-atelier-strip">
              {atelierMetrics.map((metric) => (
                <div key={metric.label} className="premium-atelier-metric">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="premium-machine-panel">
              <div className="relative">
                <div className="premium-console-header">
                  <span>Production Command</span>
                  <strong>LIVE</strong>
                </div>

                <div className="premium-gantry-stage" aria-hidden="true">
                  <div className="premium-gantry-rail" />
                  <div className="premium-gantry-head"><span /></div>
                  <div className="premium-gantry-bed">
                    <span /><span /><span />
                  </div>
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
          </div>
        </div>

        <div className="stats-row premium-stats-row">
          {stats.map((stat, i) => (
            <CountStat key={stat.label} stat={stat} index={i} />
          ))}
        </div>

        <div className="mx-auto mt-5 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
          <Clock className="h-3.5 w-3.5" />
          Production timelines shared before confirmation
          <Sparkles className="h-3.5 w-3.5 text-[#6d28d9]" />
        </div>
      </div>
    </section>
  )
}
