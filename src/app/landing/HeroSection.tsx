'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, ArrowDown, MapPin, Shield, Clock, Printer, Sparkles, Layers, Gauge, ScanLine } from 'lucide-react'

const stats = [
  { value: 99, prefix: '₹', suffix: '', label: 'Entry Prints' },
  { value: 4, prefix: '', suffix: 'hr', label: 'Express Queue' },
  { value: 500, prefix: '', suffix: '+', label: 'Orders Delivered' },
  { value: 15, prefix: '', suffix: '+', label: 'Materials Ready' },
  { value: 19000, prefix: '', suffix: '+', label: 'Pin Codes Served' }
]

const productionSignals = [
  { icon: Printer, label: 'Bambu Lab P2S fleet', value: 'Calibrated daily' },
  { icon: Layers, label: 'FDM + Resin', value: '0.05mm layers' },
  { icon: Shield, label: 'NDA ready', value: 'IP stays yours' },
]

const heroBadges = [
  'Industrial parts',
  'Architecture models',
  'Student projects',
  'Creator props',
  'Corporate gifting',
]

const atelierMetrics = [
  { label: 'Tolerance', value: '±0.2mm' },
  { label: 'Queue', value: 'Live' },
  { label: 'QC', value: 'Photo proof' },
]

const materialRack = [
  { label: 'PLA+', color: '#67e8f9' },
  { label: 'PETG', color: '#34d399' },
  { label: 'Resin', color: '#c4b5fd' },
  { label: 'Nylon', color: '#fbbf24' },
]

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function useCountUp(target: number, duration = 1800) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [value, setValue] = useState(target)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let frame = 0

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        observer.disconnect()
        setHasStarted(true)
        setValue(0)

        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          setValue(Math.round(target * easeOutCubic(progress)))

          if (progress < 1) {
            frame = window.requestAnimationFrame(tick)
          }
        }

        frame = window.requestAnimationFrame(tick)
      },
      { threshold: 0.35, rootMargin: '0px 0px -80px 0px' }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [duration, target])

  return { ref, value, hasStarted }
}

function CountStat({
  stat,
  index,
}: {
  stat: { value: number; prefix: string; suffix: string; label: string }
  index: number
}) {
  const { ref, value, hasStarted } = useCountUp(stat.value)
  const display = `${stat.prefix}${value.toLocaleString('en-IN')}${stat.suffix}`

  return (
    <motion.div
      ref={ref}
      className="stat-item premium-stat-item group relative"
      variants={statItem}
      custom={index}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <span className="mx-auto mb-3 block h-1.5 w-1.5 rotate-45 rounded-sm bg-gradient-to-r from-violet-600 to-purple-500 opacity-80" />
      <div className="stat-number" suppressHydrationWarning>
        {display}
      </div>
      <div
        className="mx-auto mt-3 h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-violet-600 to-purple-400 transition-transform duration-[1800ms] ease-out"
        style={{ transform: hasStarted ? 'scaleX(1)' : 'scaleX(0)' }}
      />
      <div className="stat-label">{stat.label}</div>
    </motion.div>
  )
}

const heroContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
}

const statsContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const statItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="premium-hero relative overflow-hidden px-4 pb-8 pt-28 sm:px-6 md:pt-32 lg:px-10">
      <video
        className="premium-hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/pot.webp"
        aria-hidden="true"
      >
        <source src="/printer.mp4" type="video/mp4" />
      </video>

      <div className="premium-hero-surface" aria-hidden="true" />
      <div className="premium-hero-grid" aria-hidden="true" />
      <div className="premium-hero-beams" aria-hidden="true" />
      <div className="premium-corner-frame" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[calc(88svh-7rem)] w-full max-w-7xl flex-col justify-center gap-10 py-6">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_470px]">
          <motion.div
            className="max-w-5xl text-center lg:text-left"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item} className="mb-5 flex flex-col items-center gap-3 lg:items-start">
              <div className="premium-hero-badge">
                <span className="premium-live-dot" />
                Flux3D production studio · Pune, India
              </div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                <MapPin className="h-3.5 w-3.5" />
                Precision additive manufacturing · Pan-India delivery
              </p>
            </motion.div>

            <motion.h1
              variants={item}
              className="premium-hero-title text-5xl font-black leading-[0.86] text-white sm:text-6xl md:text-7xl lg:text-8xl"
            >
              <span className="premium-title-line premium-title-brand">Flux3D</span>
              <span className="premium-title-line premium-title-service">Premium 3D Printing</span>
            </motion.h1>

            <motion.p variants={item} className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/72 sm:text-lg lg:mx-0">
              Upload your model and get production-grade FDM or resin prints with clean finishes, tight tolerances, photo updates, and fast dispatch. Built for engineers, studios, students, founders, and creators.
            </motion.p>

            <motion.div variants={item} className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {heroBadges.map((badge) => (
                <span key={badge} className="premium-chip">
                  {badge}
                </span>
              ))}
            </motion.div>

            <motion.p variants={item} className="mx-auto mt-5 max-w-[620px] text-xs font-semibold uppercase tracking-[0.16em] text-white/48 lg:mx-0">
              Bambu Lab P2S · Resin 4K · Starting at ₹99 · No minimum order
            </motion.p>

            <motion.div variants={item} className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/instant-quote"
                  className="premium-primary-cta group relative flex min-h-[56px] items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-4 text-center text-sm font-bold text-white transition-all duration-300"
                >
                  <span className="relative z-10">Upload Model & Get Quote</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <a
                  href="#services"
                  className="premium-secondary-cta flex min-h-[56px] min-w-[170px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-4 text-sm font-bold text-white transition-all duration-200"
                >
                  Explore Services
                  <ArrowDown className="h-4 w-4" />
                </a>
              </motion.div>
            </motion.div>

            <motion.p variants={item} className="mt-4 text-center text-xs font-medium text-white/48 lg:text-left">
              Free quote in 2 minutes · WhatsApp support · Tracked delivery
            </motion.p>

            <motion.div variants={item} className="premium-atelier-strip">
              {atelierMetrics.map((metric) => (
                <div key={metric.label} className="premium-atelier-metric">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <div className="relative hidden lg:block">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
              className="premium-machine-panel"
            >
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={shouldReduceMotion ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
              >
                <div className="premium-console-header">
                  <span>Production Command</span>
                  <strong>LIVE</strong>
                </div>

                <div className="premium-gantry-stage" aria-hidden="true">
                  <div className="premium-gantry-rail" />
                  <div className="premium-gantry-head">
                    <span />
                  </div>
                  <div className="premium-gantry-bed">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="premium-machine-window">
                  <div className="premium-machine-scan" aria-hidden="true" />
                  <div className="premium-print-preview" aria-hidden="true">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span
                        key={index}
                        style={{
                          '--layer-y': `${(index - 4) * 9}px`,
                          '--layer-width': `${78 - index * 4}px`,
                          '--layer-delay': `${index * 90}ms`,
                        } as CSSProperties}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Current build</p>
                    <p className="mt-1 text-2xl font-black text-white">Functional PETG bracket</p>
                    <p className="mt-2 text-sm leading-6 text-white/58">Layer 1,286 of 1,920 · quality camera active</p>
                  </div>
                </div>

                <div className="premium-build-progress" aria-hidden="true">
                  <span />
                </div>

                <div className="premium-material-rack">
                  {materialRack.map((material) => (
                    <div key={material.label}>
                      <span style={{ backgroundColor: material.color }} />
                      {material.label}
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  {productionSignals.map((signal, index) => (
                    <motion.div
                      key={signal.label}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + index * 0.1 }}
                      className="premium-signal-row"
                    >
                      <signal.icon className="h-4 w-4 text-cyan-200" />
                      <span>{signal.label}</span>
                      <strong>{signal.value}</strong>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="stats-row premium-stats-row"
          variants={statsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {stats.map((stat, i) => (
            <CountStat key={stat.label} stat={stat} index={i} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mx-auto mt-5 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/38"
        >
          <Clock className="h-3.5 w-3.5" />
          Express queue opens daily at 10:00
          <Sparkles className="h-3.5 w-3.5 text-amber-200" />
          <ScanLine className="h-3.5 w-3.5 text-cyan-200" />
          <Gauge className="h-3.5 w-3.5 text-emerald-200" />
        </motion.div>
      </div>
    </section>
  )
}
