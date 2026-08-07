'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useEffect, useRef } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  CircuitBoard,
  Clock3,
  Layers3,
  MessageCircle,
  PackageCheck,
  Ruler,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'
import { useIsFinePointer } from '@/hooks/useMediaQuery'
import { createRafThrottledCallback } from '@/lib/raf-throttle'

const heroStats = [
  { value: '500+', label: 'orders delivered' },
  { value: '10+', label: 'materials matched' },
  { value: '±0.1mm', label: 'print accuracy' },
  { value: '19k+', label: 'pin codes covered' },
]

const productionSignals = [
  { icon: Layers3, title: 'FDM + resin', body: 'Material-matched printing for strength, finish, detail, and speed.' },
  { icon: Ruler, title: 'Design review', body: 'Orientation, tolerances, supports, and finish are checked before production.' },
  { icon: ShieldCheck, title: 'Dispatch-ready QC', body: 'Parts are inspected, packed securely, and sent with tracked delivery.' },
]

const printCellSteps = [
  { label: 'File intake', value: 'STL / STEP / 3MF' },
  { label: 'Material strategy', value: 'Strength + finish' },
  { label: 'Production queue', value: 'Live scheduling' },
  { label: 'Final QC', value: 'Photo proof' },
]

const commandMetrics = [
  { icon: CircuitBoard, label: 'Fleet', value: 'P2S + Resin' },
  { icon: Clock3, label: 'Rush', value: '24hr available' },
  { icon: PackageCheck, label: 'Dispatch', value: 'Tracked' },
]

const marqueeItems = [
  'Industrial prototypes',
  'Architecture models',
  'Student builds',
  'Medical models',
  'Creator props',
  'Corporate gifts',
  'Small-batch products',
  'Replacement parts',
]

const container: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
  },
}

function ServicesPremiumFX() {
  const meterRef = useRef<HTMLSpanElement | null>(null)
  const isFinePointer = useIsFinePointer()

  useEffect(() => {
    if (!isFinePointer) return

    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0

    const updatePointer = (event: PointerEvent) => {
      if (!window.matchMedia('(pointer: fine)').matches) return
      pointerX = event.clientX
      pointerY = event.clientY
      if (pointerFrame) return
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0
        document.documentElement.style.setProperty('--services-pointer-x', `${pointerX}px`)
        document.documentElement.style.setProperty('--services-pointer-y', `${pointerY}px`)
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
      <div className="services-pointer-light" aria-hidden="true" />
      <div className="services-scroll-meter" aria-hidden="true">
        <span ref={meterRef} />
      </div>
    </>
  )
}

export default function ServicesHero() {
  const { settings } = useBusinessSettings()
  const reduceMotion = useReducedMotion()
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')
  const businessName = settings.businessName || 'Flux3D'

  return (
    <section className="services-hero-premium relative isolate overflow-hidden px-4 pb-10 pt-8 text-[#070b1d] md:px-8 lg:px-16">
      <ServicesPremiumFX />
      <div className="services-hero-depth" aria-hidden="true" />
      <div className="services-hero-grid" aria-hidden="true" />
      <div className="services-hero-beam" aria-hidden="true" />
      <div className="services-hero-frame" aria-hidden="true" />

      <motion.div
        variants={container}
        animate="visible"
        className="relative z-10 mx-auto flex min-h-[76svh] w-full max-w-[1220px] min-w-0 flex-col justify-start pb-10 pt-10 md:pt-12 lg:pt-14"
      >
        <motion.div variants={item} className="mb-4 flex items-center gap-2 text-sm font-medium text-[#6b7280]">
          <Link href="/" className="transition hover:text-[#070b1d]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#070b1d]">Services</span>
        </motion.div>

        <motion.div
          variants={item}
          className="services-hero-kicker mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold uppercase text-[#6d28d9] shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-[#6d28d9]" />
          Premium service atelier
        </motion.div>

        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div className="min-w-0">
            <motion.h1
              variants={item}
              className="services-hero-title max-w-[calc(100vw-2rem)] break-words text-[clamp(2.4rem,9vw,5rem)] font-black leading-[1.06] text-[#070b1d] sm:text-6xl sm:leading-[0.98] lg:max-w-5xl lg:text-8xl lg:leading-[0.9]"
            >
              Services engineered for premium output.
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-[calc(100vw-2rem)] text-base leading-7 text-[#6b7280] sm:text-lg lg:max-w-2xl lg:leading-8"
            >
              Flux3D turns prototypes, presentation models, functional parts, props, gifts, and small-batch products into finished objects with material guidance, print planning, finishing, and Pan-India delivery.
            </motion.p>

            <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/instant-quote"
                className="services-primary-action group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#6d28d9] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(109,40,217,0.3)] transition hover:bg-[#5b21b6]"
              >
                Get Instant Quote
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(businessName)}!%20I%20want%20to%20discuss%20a%203D%20printing%20project.`}
                target="_blank"
                rel="noopener noreferrer"
                className="services-secondary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#6d28d9]/30 px-6 text-sm font-bold text-[#6d28d9] transition hover:border-[#6d28d9]/50 hover:bg-purple-50"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                Discuss Project
              </a>
            </motion.div>
          </div>

          <motion.div variants={item} className="services-command-panel grid min-w-0 gap-4">
            <div className="services-command-topline">
              <span>Service command</span>
              <strong>online</strong>
            </div>

            <div className="services-print-cell" aria-hidden="true">
              <div className="services-print-rail" />
              <div className="services-print-head">
                <span />
              </div>
              <div className="services-print-bed">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {commandMetrics.map((metric) => (
                <div key={metric.label} className="services-command-metric">
                  <metric.icon className="h-4 w-4" />
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>

            <div className="services-workflow-stack">
              {printCellSteps.map((step, index) => (
                <div key={step.label}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{step.label}</p>
                  <strong>{step.value}</strong>
                </div>
              ))}
            </div>

            {productionSignals.map((signal, index) => (
              <motion.div
                key={signal.title}
                animate={reduceMotion ? {} : { y: [0, index % 2 === 0 ? -5 : 5, 0] }}
                transition={reduceMotion ? undefined : { duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
                className="services-signal-card min-w-0 overflow-hidden rounded-lg border border-purple-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6d28d9] text-white">
                    <signal.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-[#070b1d]">{signal.title}</div>
                    <p className="mt-1 break-words text-xs leading-5 text-[#6b7280]">{signal.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div variants={item} className="services-hero-stats mt-10 grid w-full overflow-hidden rounded-lg border border-purple-200 bg-white shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {heroStats.map((stat) => (
            <div key={stat.label} className="border-b border-purple-100 p-5 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
              <div className="text-3xl font-extrabold text-[#070b1d]">{stat.value}</div>
              <div className="mt-1 text-xs font-bold uppercase text-[#6b7280]">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <div className={`services-marquee relative z-10 mx-auto w-full max-w-[1200px] overflow-hidden border-y border-purple-200 py-3 ${reduceMotion ? 'overflow-x-auto' : ''}`}>
        <motion.div
          aria-hidden="true"
          className="flex w-max gap-3"
          animate={reduceMotion ? {} : { x: ['0%', '-50%'] }}
          transition={reduceMotion ? undefined : { duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          {[...marqueeItems, ...marqueeItems].map((label, index) => (
            <span key={`${label}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold uppercase text-[#6b7280]">
              {index % 3 === 0 ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> : index % 3 === 1 ? <Zap className="h-3.5 w-3.5 text-amber-500" /> : <Truck className="h-3.5 w-3.5 text-sky-500" />}
              {label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
