'use client'

import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowDown, MapPin } from 'lucide-react'

const stats = [
  { value: 99, prefix: '₹', suffix: '', label: 'Prints Start At' },
  { value: 4, prefix: '', suffix: 'hr', label: 'Express Turnaround' },
  { value: 500, prefix: '', suffix: '+', label: 'Orders Delivered' },
  { value: 15, prefix: '', suffix: '+', label: 'Materials in Stock' },
  { value: 19000, prefix: '', suffix: '+', label: 'Pin Codes Delivered' }
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
      className="stat-item group relative"
      variants={statItem}
      custom={index}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <span className="mx-auto mb-3 block h-1.5 w-1.5 rotate-45 rounded-sm bg-[var(--brand-primary)] opacity-80" />
      <div className="stat-number" suppressHydrationWarning>
        {display}
      </div>
      <div
        className="mx-auto mt-3 h-0.5 w-16 origin-left rounded-full bg-[var(--brand-primary)] transition-transform duration-[1800ms] ease-out"
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
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-[#f8f6f2] via-[#f0ede8] to-[#e8e4df] px-6 pb-16 pt-20 md:px-12 lg:px-20">
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            className="flex flex-col gap-6 text-center lg:text-left"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item} className="mb-0 flex flex-col items-center gap-3 lg:items-start">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Now Printing on Bambu Lab P2S · Pune, India
              </div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                Precision engineering · Pan-India delivery
              </p>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-5xl font-extrabold leading-[1.1] tracking-tight text-[#1a1a1a] md:text-6xl lg:text-7xl"
            >
              Where Ideas Become Reality,{' '}
              <span className="text-orange-500">Layer by Layer.</span>
            </motion.h1>

            <motion.p variants={item} className="mx-auto max-w-[560px] text-sm font-normal leading-relaxed text-[var(--text-secondary)] sm:text-base lg:mx-0">
              India&apos;s most trusted 3D printing service. Industrial parts, architecture models, student projects, medical models, creator props & corporate gifts — all printed with micron-level precision.
            </motion.p>

            <motion.p variants={item} className="mx-auto max-w-[520px] text-[11px] font-medium leading-5 text-[var(--text-muted)] sm:text-xs lg:mx-0">
              Powered by Bambu Lab P2S · Starting at ₹99 · Pan-India Delivery
            </motion.p>

            <motion.div variants={item} className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/instant-quote"
                  className="relative flex min-h-[52px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-orange-500 px-6 py-4 text-center text-sm font-semibold text-white shadow-[0_12px_32px_rgba(249,115,22,0.18)] transition-all duration-200 after:absolute after:inset-0 after:rounded-xl after:border-2 after:border-orange-400 after:opacity-20 after:animate-ping hover:scale-[1.03] hover:bg-orange-600 hover:shadow-lg"
                >
                  <span className="relative z-10">Upload Your Model & Get Quote</span>
                  <ArrowRight className="relative z-10 h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <a
                  href="#services"
                  className="flex min-h-[52px] min-w-[160px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-[#faf9f7] px-6 py-4 text-sm font-semibold text-[#1a1a1a] transition-all duration-200 hover:bg-gray-50"
                >
                  View Our Work
                  <ArrowDown className="h-4 w-4" />
                </a>
              </motion.div>
            </motion.div>

            <motion.p variants={item} className="text-center text-xs font-medium text-[var(--text-muted)] lg:text-left">
              No account needed · Free quote in 2 minutes · 500+ happy customers
            </motion.p>
          </motion.div>

          <div className="relative order-2 flex items-center justify-center pr-0 lg:order-none lg:translate-x-20 lg:justify-end lg:pr-0 min-[1440px]:translate-x-[calc((100vw-80rem)/2)]">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/pot.webp"
                  alt="3D printed pot showcase"
                  priority
                  width={520}
                  height={520}
                  quality={75}
                  className="h-auto w-full max-w-[520px] rounded-2xl object-contain drop-shadow-2xl"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="stats-row"
          variants={statsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {stats.map((stat, i) => (
            <CountStat key={stat.label} stat={stat} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
