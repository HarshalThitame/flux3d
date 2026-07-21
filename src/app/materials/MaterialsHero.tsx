'use client'

import { motion, useInView, useReducedMotion, type Variants } from 'framer-motion'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  Layers,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Sparkles,
  Thermometer,
} from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'
import { useIsFinePointer } from '@/hooks/useMediaQuery'
import { createRafThrottledCallback } from '@/lib/raf-throttle'

const materialHighlights = [
  { label: 'PLA+', value: 'Clean prototypes', meta: 'Sharp, light, fast' },
  { label: 'PETG', value: 'Balanced strength', meta: 'Tough daily-use parts' },
  { label: 'ABS / ASA', value: 'Heat-ready parts', meta: 'Built for demanding jobs' },
  { label: 'Resin', value: 'Fine detail', meta: 'Presentation-grade finish' },
]

const heroStats = [
  { icon: Layers, label: '10+ stocked materials', value: 'FDM + resin' },
  { icon: ShieldCheck, label: 'Dried, tested batches', value: 'QC logged' },
  { icon: Ruler, label: 'Material guidance', value: 'Per part' },
]

const labMetrics = [
  { icon: Thermometer, label: 'Heat range', value: 'Indoor to outdoor' },
  { icon: ShieldCheck, label: 'Strength map', value: 'Display to load' },
  { icon: Sparkles, label: 'Finish grade', value: 'Raw to premium' },
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

function MaterialsPremiumFX() {
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
        document.documentElement.style.setProperty('--materials-pointer-x', `${pointerX}px`)
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
      <div className="materials-pointer-light" aria-hidden="true" />
      <div className="materials-scroll-meter" aria-hidden="true">
        <span ref={meterRef} />
      </div>
    </>
  )
}

export default function MaterialsHero() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const reduceMotion = useReducedMotion()
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')

  return (
    <section ref={ref} className="materials-hero-premium relative isolate overflow-hidden px-4 pb-12 pt-8 text-[#0F1B3D] md:px-8 lg:px-16">
      <MaterialsPremiumFX />
      <div className="materials-hero-depth" aria-hidden="true" />
      <div className="materials-hero-grid" aria-hidden="true" />
      <div className="materials-hero-beam" aria-hidden="true" />
      <div className="materials-hero-frame" aria-hidden="true" />

      <motion.div
        variants={container}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="relative z-10 mx-auto flex min-h-[82svh] w-full max-w-[1220px] min-w-0 flex-col justify-start pb-10 pt-10 md:pt-14 lg:pt-16"
      >
        <motion.div variants={item} className="mb-4 flex items-center gap-2 text-sm font-medium text-[#6b7280]">
          <Link href="/" className="transition hover:text-[#0F1B3D]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#0F1B3D]">Materials</span>
        </motion.div>

        <motion.div
          variants={item}
          className="materials-hero-kicker mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold uppercase text-[#6d28d9] shadow-sm"
        >
          <FlaskConical className="h-4 w-4 text-[#6d28d9]" />
          Material intelligence lab
        </motion.div>

        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div className="min-w-0">
            <motion.h1
              variants={item}
              className="materials-hero-title max-w-[calc(100vw-2rem)] break-words text-[clamp(2.4rem,9vw,5rem)] font-black leading-[1.04] text-[#0F1B3D] sm:text-6xl sm:leading-[0.96] lg:max-w-5xl lg:text-8xl lg:leading-[0.9]"
            >
              Materials chosen with engineering precision.
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-[calc(100vw-2rem)] text-base leading-7 text-[#6b7280] sm:text-lg lg:max-w-2xl lg:leading-8"
            >
              Compare finish, strength, heat resistance, flexibility, and cost before you upload. Flux3D pairs each job with a material that fits the part, not just the printer.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/instant-quote"
                className="materials-primary-action group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#6d28d9] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(109,40,217,0.3)] transition hover:bg-[#5b21b6]"
              >
                Upload File
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20need%20help%20choosing%20a%20material%20for%20my%20project.`}
                target="_blank"
                rel="noopener noreferrer"
                className="materials-secondary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#6d28d9]/30 px-6 text-sm font-bold text-[#6d28d9] transition hover:border-[#6d28d9]/50 hover:bg-purple-50"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                Ask Material Expert
              </a>
            </motion.div>

          <motion.div
            variants={item}
            className="materials-hero-stats mt-8 grid gap-3 sm:grid-cols-3"
          >
            {heroStats.map((stat) => (
              <div key={stat.label} className="min-w-0 rounded-lg border border-purple-200 bg-white p-4 shadow-sm">
                <stat.icon className="mb-4 h-4 w-4 text-[#6d28d9]" />
                <div className="text-xs font-bold uppercase text-[#6b7280]">{stat.label}</div>
                <div className="mt-1 text-sm font-extrabold text-[#0F1B3D]">{stat.value}</div>
              </div>
            ))}
          </motion.div>
          </div>

          <motion.div
            variants={item}
            className="materials-lab-panel grid min-w-0 gap-4"
          >
            <div className="materials-lab-topline">
              <span>Material command</span>
              <strong>calibrated</strong>
            </div>

            <div className="materials-spool-stage" aria-hidden="true">
              <div className="materials-spool">
                <span />
                <span />
              </div>
              <div className="materials-filament-line" />
              <div className="materials-vial">
                <span />
              </div>
              <div className="materials-scanline" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {labMetrics.map((metric) => (
                <div key={metric.label} className="materials-lab-metric">
                  <metric.icon className="h-4 w-4" />
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>

            <div className="materials-shortlist">
              {materialHighlights.map((material) => (
                <motion.div
                  key={material.label}
                  animate={reduceMotion ? {} : { y: [0, -4, 0] }}
                  transition={reduceMotion ? undefined : { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-[#0F1B3D]">{material.label}</div>
                    <div className="mt-0.5 text-xs font-medium text-[#6b7280]">{material.value}</div>
                  </div>
                  <span>
                    {material.meta}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="materials-selection-rule">
              <p className="text-xs font-semibold uppercase text-[#6b7280]">Selection rule</p>
              <p className="mt-2 text-sm leading-6 text-[#374151]">
                Strong parts start with PETG, ABS, ASA, or Nylon. Display pieces start with PLA+, Silk PLA, or Resin.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
