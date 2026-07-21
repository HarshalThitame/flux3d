'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useEffect, useRef } from 'react'
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gauge,
  IndianRupee,
  Layers3,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Wand2,
} from 'lucide-react'
import DeferredHeroVideo from '@/components/DeferredHeroVideo'
import { useIsFinePointer } from '@/hooks/useMediaQuery'
import { createRafThrottledCallback } from '@/lib/raf-throttle'

type MaterialPricing = {
  name: string
  price_per_gram: number
  density: number
}

const quoteDrivers = [
  {
    title: 'Material',
    description: 'PLA, ABS, PETG, resin, and specialty filaments are priced by consumption and availability.',
    icon: Layers3,
  },
  {
    title: 'Geometry',
    description: 'Wall thickness, supports, infill, and part orientation shape machine time and material use.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Finish',
    description: 'Sanding, priming, painting, smoothing, and assembly are quoted as controlled add-ons.',
    icon: Wand2,
  },
  {
    title: 'Timeline',
    description: 'Standard, priority, and batch runs are planned around quality checks and delivery dates.',
    icon: Clock3,
  },
]

const workflow = [
  'Upload your STL, STEP, OBJ, or reference files.',
  'Choose material, finish, quantity, and delivery priority.',
  'Receive a clear quote with print, finish, and shipping details.',
  'Approve the order and track production through dispatch.',
]

const assuranceItems = [
  'No hidden finishing charges',
  'Material and print-time review',
  'Pan-India shipping support',
]

const commandMetrics = [
  { icon: Calculator, label: 'Quote mode', value: 'Geometry-led' },
  { icon: Gauge, label: 'Rate lock', value: 'Before print' },
  { icon: PackageCheck, label: 'Dispatch', value: 'Tracked' },
]

const heroStats = [
  { label: 'Starting rate', value: 'Live materials' },
  { label: 'Quote inputs', value: '4 key drivers' },
  { label: 'Review path', value: 'Upload to dispatch' },
]

const container: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
  },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value)
}

function PricingPremiumFX() {
  const meterRef = useRef<HTMLSpanElement | null>(null)
  const isFinePointer = useIsFinePointer()

  useEffect(() => {
    if (!isFinePointer) return

    let pointerFrame = 0
    let pointerX = 0

    const updatePointer = (event: PointerEvent) => {
      if (!window.matchMedia('(pointer: fine)').matches) return
      pointerX = event.clientX
      if (pointerFrame) return
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0
        document.documentElement.style.setProperty('--pricing-pointer-x', `${pointerX}px`)
      })
    }

    const updateProgress = () => {
      const page = document.documentElement
      const maxScroll = Math.max(page.scrollHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${progress})`
      }
    }
    const scheduleProgress = createRafThrottledCallback(updateProgress)

    updateProgress()
    window.addEventListener('pointermove', updatePointer, { passive: true })
    window.addEventListener('scroll', scheduleProgress, { passive: true })
    window.addEventListener('resize', scheduleProgress)

    return () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
      scheduleProgress.cancel()
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('scroll', scheduleProgress)
      window.removeEventListener('resize', scheduleProgress)
    }
  }, [])

  return (
    <>
      <div className="pricing-pointer-light" aria-hidden="true" />
      <div className="pricing-scroll-meter" aria-hidden="true">
        <span ref={meterRef} />
      </div>
    </>
  )
}

export default function PricingClient({
  materials,
}: {
  materials: MaterialPricing[]
}) {
  const reduceMotion = useReducedMotion()
  const displayMaterials = materials.filter((material) => material.name).slice(0, 8)
  if (displayMaterials.length === 0) {
    return (
      <main className="pricing-premium-content text-[#0F1B3D]">
        <PricingPremiumFX />
        <section className="relative mx-auto flex min-h-[82svh] w-full max-w-[1220px] items-center px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase text-[#6d28d9]">Pricing unavailable</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-[#0F1B3D] md:text-6xl">
              Public material pricing is not configured yet.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#6b7280]">
              Flux 3D can still review your file and provide a custom quotation. Please use the contact page to request a quote and share your requirements.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#6d28d9] px-6 text-sm font-bold text-white transition hover:bg-[#5b21b6]">
                Contact sales
              </Link>
              <Link href="/features" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#6d28d9]/30 px-6 text-sm font-bold text-[#6d28d9] transition hover:border-[#6d28d9]/50 hover:bg-purple-50">
                View services
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const startingMaterial = displayMaterials.find((material) => Number(material.price_per_gram) > 0) || displayMaterials[0]
  const startingPrice = startingMaterial?.price_per_gram ?? 0
  const costStack = [
    { label: 'Material baseline', value: `₹${formatCurrency(startingPrice)}/g`, width: '38%' },
    { label: 'Geometry + supports', value: 'calculated', width: '68%' },
    { label: 'Finish + quantity', value: 'reviewed', width: '52%' },
    { label: 'Shipping + timeline', value: 'locked', width: '44%' },
  ]

  return (
    <main className="pricing-premium-content text-[#0F1B3D]">
      <PricingPremiumFX />

      <section className="pricing-hero-premium relative isolate overflow-hidden px-4 pb-12 pt-6 text-[#0F1B3D] sm:px-6 md:px-10 lg:px-12">
        <div className="pricing-hero-depth" aria-hidden="true" />
        <div className="pricing-hero-grid" aria-hidden="true" />
        <div className="pricing-hero-beam" aria-hidden="true" />
        <div className="pricing-hero-frame" aria-hidden="true" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="relative z-10 mx-auto flex min-h-[82svh] w-full max-w-[1220px] min-w-0 flex-col justify-start pb-10 pt-8 md:pt-10 lg:pt-12"
        >
          <motion.div variants={item} className="mb-4 flex items-center gap-2 text-sm font-medium text-[#6b7280]">
            <Link href="/" className="transition hover:text-[#0F1B3D]">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#0F1B3D]">Pricing</span>
          </motion.div>

          <motion.div
            variants={item}
            className="pricing-hero-kicker mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold uppercase text-[#6d28d9] shadow-sm"
          >
            <IndianRupee className="h-4 w-4 text-[#6d28d9]" />
            Transparent quote command
          </motion.div>

          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
            <div className="min-w-0">
              <motion.h1
                variants={item}
                className="pricing-hero-title max-w-[calc(100vw-2rem)] break-words text-[clamp(2.4rem,9vw,5rem)] font-black leading-[1.04] text-[#0F1B3D] sm:text-6xl sm:leading-[0.96] lg:max-w-5xl lg:text-8xl lg:leading-[0.9]"
              >
                Pricing engineered before production starts.
              </motion.h1>

              <motion.p
                variants={item}
                className="mt-6 max-w-[calc(100vw-2rem)] text-base leading-7 text-[#6b7280] sm:text-lg lg:max-w-2xl lg:leading-8"
              >
                See starting material rates, understand the drivers behind the final quote, and upload a file when you want a production-ready price with no hidden finishing surprises.
              </motion.p>

              <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/instant-quote"
                  className="pricing-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#6d28d9] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(109,40,217,0.3)] transition hover:bg-[#5b21b6]"
                >
                  Upload for quote
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/materials"
                  className="pricing-secondary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#6d28d9]/30 px-6 text-sm font-bold text-[#6d28d9] transition hover:border-[#6d28d9]/50 hover:bg-purple-50"
                >
                  Compare materials
                </Link>
              </motion.div>

              <motion.div variants={item} className="pricing-hero-stats mt-8 grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="min-w-0 rounded-lg border border-purple-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase text-[#6b7280]">{stat.label}</div>
                    <div className="mt-2 text-sm font-extrabold text-[#0F1B3D]">{stat.value}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.aside variants={item} className="pricing-command-panel grid min-w-0 gap-4">
              <div className="pricing-command-topline">
                <span>Quote command</span>
                <strong>online</strong>
              </div>

              <div className="pricing-rate-display">
                <div>
                  <p>Starting from</p>
                  <strong>₹{formatCurrency(startingPrice)}/g</strong>
                  <span>{startingMaterial?.name || 'PLA'} material baseline</span>
                </div>
                <ShieldCheck className="h-7 w-7" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {commandMetrics.map((metric) => (
                  <div key={metric.label} className="pricing-command-metric">
                    <metric.icon className="h-4 w-4" />
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="pricing-cost-stack">
                {costStack.map((cost, index) => (
                  <motion.div
                    key={cost.label}
                    animate={reduceMotion ? {} : { y: [0, index % 2 === 0 ? -3 : 3, 0] }}
                    transition={reduceMotion ? undefined : { duration: 4.8 + index * 0.35, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{cost.label}</span>
                      <strong>{cost.value}</strong>
                    </div>
                    <i style={{ width: cost.width }} />
                  </motion.div>
                ))}
              </div>

              <div className="pricing-assurance-list">
                {assuranceItems.map((entry) => (
                  <div key={entry}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </motion.aside>
          </div>
        </motion.div>
      </section>

      <section className="pricing-premium-section pricing-drivers-section relative overflow-hidden px-4 py-20 sm:px-6 md:px-10 lg:px-12">
        <div className="pricing-section-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1220px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
          >
            <div>
              <p className="text-sm font-bold uppercase text-[#6d28d9]">Quote drivers</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#0F1B3D] md:text-5xl">What shapes the final quote</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#6b7280]">
              The listed material rate is only the starting point. The production review locks the final amount.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quoteDrivers.map((driver, index) => (
              <motion.div
                key={driver.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.06 * index }}
                className="pricing-driver-card rounded-lg border border-purple-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#6d28d9] text-white">
                  <driver.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0F1B3D]">{driver.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#6b7280]">{driver.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing-premium-section pricing-rates-section relative overflow-hidden px-4 py-20 sm:px-6 md:px-10 lg:px-12">
        <div className="pricing-section-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-[1220px] gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-bold uppercase text-[#6d28d9]">Material rates</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#0F1B3D] md:text-5xl">Clear per-gram starting points</h2>
            <p className="mt-4 text-sm leading-7 text-[#6b7280]">
              Use these rates to compare material direction before upload. The final quote includes print setup, supports, finish, quantity, and delivery needs.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pricing-rates-panel overflow-hidden rounded-lg border border-purple-200 bg-white"
          >
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] border-b border-purple-200 bg-purple-50 px-4 py-3 text-xs font-bold uppercase text-[#6b7280]">
              <span>Material</span>
              <span>Rate</span>
              <span>Density</span>
            </div>
            {displayMaterials.map((material) => (
              <div
                key={material.name}
                className="grid grid-cols-[1.2fr_0.8fr_0.8fr] items-center gap-3 border-b border-purple-100 px-4 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#0F1B3D]">{material.name}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Production material</p>
                </div>
                <p className="text-sm font-extrabold text-[#6d28d9]">₹{formatCurrency(Number(material.price_per_gram || 0))}/g</p>
                <p className="text-sm text-[#6b7280]">{Number(material.density || 0).toFixed(2)} g/cm3</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="pricing-premium-section pricing-workflow-section relative overflow-hidden px-4 py-20 sm:px-6 md:px-10 lg:px-12">
        <div className="pricing-section-grid" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pricing-workflow-panel relative z-10 mx-auto max-w-[1220px] rounded-lg border border-purple-200 bg-white p-6 md:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-[#6d28d9]">Quote workflow</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#0F1B3D] md:text-5xl">From upload to dispatch</h2>
              <p className="mt-4 text-sm leading-7 text-[#6b7280]">
                A clear review path keeps pricing accurate before production starts.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {workflow.map((step, index) => (
                <div key={step} className="pricing-step-card rounded-lg border border-purple-200 bg-white p-4">
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9] text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-[#374151]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="pricing-premium-section pricing-bottom-cta relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 md:px-10 lg:px-12">
        <div className="pricing-section-grid" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pricing-cta-panel relative z-10 mx-auto grid max-w-[1220px] gap-5 rounded-lg border border-purple-200 bg-white p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8"
        >
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#6d28d9] text-white">
              <PackageCheck className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-[#0F1B3D] md:text-5xl">Ready for a real quote?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7280]">
              Upload your file and Flux3D will price the part around actual geometry, material, finish, and production timeline.
            </p>
          </div>
          <Link
            href="/instant-quote"
            className="pricing-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#6d28d9] px-6 text-sm font-bold text-white transition hover:bg-[#5b21b6]"
          >
            Upload model
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>
    </main>
  )
}
