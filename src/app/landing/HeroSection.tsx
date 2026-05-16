'use client'

import { animate, motion, useInView, useMotionValue, useTransform, type Variants } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { ArrowRight, ArrowDown, MapPin } from 'lucide-react'

const particles = [
  { id: 0, x: 8, y: 18, size: 3, duration: 4.2, delay: 0.1 },
  { id: 1, x: 18, y: 72, size: 2, duration: 3.8, delay: 0.7 },
  { id: 2, x: 24, y: 28, size: 2, duration: 4.5, delay: 1.1 },
  { id: 3, x: 30, y: 82, size: 4, duration: 4.8, delay: 0.5 },
  { id: 4, x: 37, y: 22, size: 2, duration: 3.6, delay: 1.5 },
  { id: 5, x: 44, y: 64, size: 3, duration: 4.4, delay: 0.2 },
  { id: 6, x: 51, y: 16, size: 2, duration: 4.9, delay: 1.8 },
  { id: 7, x: 58, y: 76, size: 3, duration: 3.9, delay: 0.9 },
  { id: 8, x: 64, y: 34, size: 2, duration: 4.1, delay: 0.4 },
  { id: 9, x: 72, y: 58, size: 4, duration: 5.1, delay: 1.3 },
  { id: 10, x: 78, y: 24, size: 2, duration: 3.7, delay: 0.8 },
  { id: 11, x: 84, y: 70, size: 3, duration: 4.6, delay: 1.6 },
  { id: 12, x: 12, y: 42, size: 2, duration: 4.3, delay: 0.3 },
  { id: 13, x: 48, y: 88, size: 3, duration: 5.0, delay: 1.2 },
  { id: 14, x: 92, y: 32, size: 2, duration: 3.5, delay: 0.6 },
  { id: 15, x: 60, y: 4, size: 2, duration: 4.7, delay: 1.4 },
]

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-[var(--accent)]"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size * 4}px`,
            height: `${particle.size * 4}px`,
          }}
          initial={{ opacity: 0.12, y: 0 }}
          animate={{ opacity: [0.12, 0.36, 0.12], y: [0, -18, 0] }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}


const orbs = [
  { id: 'a', x: '15%', y: '20%', w: 500, h: 500, op: 0.15, grad: 'from-[#7C5CFF]/20 to-[#A78BFA]/10', motion: { x: [-20, 28, -20], y: [0, -36, 0], scale: [1, 1.06, 1] } },
  { id: 'b', x: '70%', y: '60%', w: 400, h: 400, op: 0.12, grad: 'from-[#A78BFA]/20 to-[#06B6D4]/10', motion: { x: [24, -22, 24], y: [-18, 18, -18], scale: [1, 0.94, 1] } },
  { id: 'c', x: '50%', y: '80%', w: 350, h: 350, op: 0.1, grad: 'from-[#06B6D4]/15 to-transparent', motion: { x: [-14, 20, -14], y: [18, -16, 18], scale: [0.96, 1.04, 0.96] } },
]

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.w,
            height: orb.h,
            marginLeft: -orb.w / 2,
            marginTop: -orb.h / 2,
          }}
          animate={orb.motion}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className={`h-full w-full rounded-full bg-gradient-to-br ${orb.grad} opacity-[var(--op)] blur-3xl`}
            style={{ '--op': orb.op } as React.CSSProperties}
          />
        </motion.div>
      ))}
    </div>
  )
}

const bubbles = [
  { id: 'b0', x: 5, size: 28, dur: 14, del: 0 },
  { id: 'b1', x: 12, size: 16, dur: 18, del: 3 },
  { id: 'b2', x: 22, size: 22, dur: 16, del: 5 },
  { id: 'b3', x: 35, size: 14, dur: 20, del: 1 },
  { id: 'b4', x: 45, size: 30, dur: 15, del: 7 },
  { id: 'b5', x: 58, size: 18, dur: 17, del: 2 },
  { id: 'b6', x: 68, size: 24, dur: 19, del: 4 },
  { id: 'b7', x: 78, size: 12, dur: 22, del: 6 },
  { id: 'b8', x: 88, size: 20, dur: 16, del: 8 },
  { id: 'b9', x: 95, size: 26, dur: 14, del: 1.5 },
]

function BubbleParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {bubbles.map((b) => (
        <motion.span
          key={b.id}
          className="absolute rounded-full border border-[var(--accent)]/15 bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.12),rgba(6,182,212,0.04))]"
          style={{
            left: `${b.x}%`,
            bottom: '-10%',
            width: b.size,
            height: b.size,
          }}
          initial={{ opacity: 0, y: 0, scale: 1 }}
          animate={{ opacity: [0, 0.2, 0.08, 0], y: ['0vh', '-100vh'], scale: [1, 0.8, 0.6] }}
          transition={{ duration: b.dur, delay: b.del, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

const twinkles = [
  { id: 't0', x: 3, y: 12, s: 3, dur: 3.2, del: 0.1 },
  { id: 't1', x: 14, y: 45, s: 2, dur: 4.1, del: 0.8 },
  { id: 't2', x: 28, y: 8, s: 2.5, dur: 3.6, del: 1.5 },
  { id: 't3', x: 38, y: 55, s: 3, dur: 4.8, del: 0.3 },
  { id: 't4', x: 50, y: 20, s: 2, dur: 3.4, del: 2.1 },
  { id: 't5', x: 62, y: 70, s: 2.5, dur: 4.5, del: 0.6 },
  { id: 't6', x: 75, y: 15, s: 3, dur: 3.9, del: 1.2 },
  { id: 't7', x: 85, y: 50, s: 2, dur: 4.2, del: 0.9 },
  { id: 't8', x: 92, y: 30, s: 2.5, dur: 3.7, del: 1.8 },
  { id: 't9', x: 20, y: 80, s: 2, dur: 4.6, del: 0.4 },
  { id: 't10', x: 70, y: 90, s: 3, dur: 3.3, del: 1.6 },
  { id: 't11', x: 45, y: 38, s: 2, dur: 4.0, del: 0.7 },
]

function TwinkleStars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {twinkles.map((t) => (
        <motion.span
          key={t.id}
          className="absolute rounded-full bg-[var(--accent-2)]"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: t.s,
            height: t.s,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.28, 0.05, 0.2, 0], scale: [0.5, 1, 0.8, 1.1, 0.7] }}
          transition={{ duration: t.dur, delay: t.del, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

const ripples = [
  { id: 'r0', x: 20, y: 25, s: 60, dur: 5, del: 0 },
  { id: 'r1', x: 75, y: 40, s: 50, dur: 6, del: 2 },
  { id: 'r2', x: 50, y: 70, s: 70, dur: 5.5, del: 1 },
  { id: 'r3', x: 85, y: 15, s: 40, dur: 4.5, del: 3.5 },
  { id: 'r4', x: 10, y: 60, s: 55, dur: 6.5, del: 1.5 },
]

function RippleRings() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          className="absolute rounded-full border border-[var(--accent)]/20"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: r.s,
            height: r.s,
            marginLeft: -r.s / 2,
            marginTop: -r.s / 2,
          }}
          initial={{ opacity: 0.3, scale: 0.3 }}
          animate={{ opacity: [0.3, 0], scale: [0.3, 2] }}
          transition={{ duration: r.dur, delay: r.del, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

const stats = [
  { value: 99, prefix: '₹', suffix: '', label: 'Prints Start At' },
  { value: 48, prefix: '', suffix: 'hr', label: 'Express Turnaround' },
  { value: 500, prefix: '', suffix: '+', label: 'Orders Delivered' },
  { value: 10, prefix: '', suffix: '+', label: 'Materials in Stock' },
  { value: 19000, prefix: '', suffix: '+', label: 'Pin Codes Delivered' }
]

function CountStat({
  stat,
  index,
}: {
  stat: { value: number; prefix: string; suffix: string; label: string }
  index: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const count = useMotionValue(0)
  const display = useTransform(count, (latest) => {
    const value = Math.round(latest).toLocaleString('en-IN')
    return `${stat.prefix}${value}${stat.suffix}`
  })

  useEffect(() => {
    if (!isInView) return
    const controls = animate(count, stat.value, {
      duration: 1.2,
      delay: 0.25 + index * 0.08,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [count, index, isInView, stat.value])

  return (
    <motion.div
      ref={ref}
      className="stat-item group relative"
      variants={item}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <motion.span
        className="mx-auto mb-2 block h-1.5 w-1.5 rotate-45 rounded-sm bg-[var(--gradient-accent)] opacity-70"
        whileHover={{ scale: 1.25, opacity: 1 }}
      />
      <motion.div className="stat-number">{display}</motion.div>
      <div className="stat-label">{stat.label}</div>
    </motion.div>
  )
}

function ImageAura() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute right-[10%] top-1/2 h-[60vh] w-[40vw] -translate-y-1/2"
        style={{ isolation: 'isolate' }}
        animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.04, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="h-full w-full rounded-[40%_60%_50%_50%/50%_40%_60%_50%]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(124,92,255,0.2) 0%, rgba(167,139,250,0.1) 40%, transparent 70%)',
          }}
          animate={{ borderRadius: ['40% 60% 50% 50% / 50% 40% 60% 50%', '50% 40% 60% 50% / 60% 50% 40% 50%', '40% 60% 50% 50% / 50% 40% 60% 50%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-4 rounded-[50%_40%_60%_50%/60%_50%_40%_50%]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(183,167,255,0.12) 0%, transparent 60%)',
          }}
          animate={{ borderRadius: ['50% 40% 60% 50% / 60% 50% 40% 50%', '42% 58% 45% 55% / 45% 60% 50% 55%', '50% 40% 60% 50% / 60% 50% 40% 50%'] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  )
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 }
  }
}

const item: Variants = {
  hidden: { opacity: 1, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
}

export default function HeroSection() {
  return (
    <section className="dot-grid-bg relative flex min-h-screen flex-col justify-center overflow-hidden pt-28">
      <FloatingOrbs />
      <div className="hero-glow hero-glow-1" />
      <div className="hero-glow hero-glow-2" />

      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(124,58,237,0.18)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_70%,rgba(6,182,212,0.08)_0%,transparent_55%)]" />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_100%_50%_at_50%_0%,rgba(124,58,237,0.05)_0%,transparent_60%)]"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div
        className="absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 92, 255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 92, 255,0.25) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 70%)'
        }}
      />

      <FloatingParticles />
      <BubbleParticles />
      <TwinkleStars />
      <RippleRings />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-10"
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <div className="h-full w-full rounded-full border border-dashed border-[var(--accent)]" />
      </motion.div>

      <div className="relative z-10 w-full">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          <motion.div
            className="hero-copy py-8 text-center lg:text-left"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div className="hero-badge" variants={item}>
              <motion.span
                className="badge-dot"
                animate={{ opacity: [1, 0.45, 1], scale: [1, 0.82, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="hidden sm:inline">Now Printing on Bambu Lab P2S · Pune, India</span>
              <span className="sm:hidden">Bambu Lab P2S · Pune</span>
            </motion.div>

            <motion.div variants={item} className="mb-3 flex items-center justify-center gap-1.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] lg:justify-start">
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Precision engineering · Pan-India delivery</span>
              <span className="sm:hidden">Precision engineering</span>
            </motion.div>

            <motion.h1
              variants={item}
              className="mb-5 font-[var(--font-syne)] text-[clamp(2.15rem,9vw,4.5rem)] font-extrabold leading-[1.05] text-[var(--text-primary)]"
            >
              <span className="block sm:inline">Where</span>{' '}
              <span className="block sm:inline">Ideas</span>{' '}
              <span className="block sm:inline">
                Become <span className="gradient-text">Reality</span>
              </span>
              <br />
              <span className="block sm:inline">Layer by</span>{' '}
              <span className="block sm:inline">Layer.</span>
            </motion.h1>

            <motion.p variants={item} className="mx-auto mb-3 max-w-[340px] px-2 text-sm leading-[1.75] text-[var(--text-secondary)] sm:max-w-[560px] sm:px-0 sm:text-base lg:mx-0">
              India&apos;s most trusted 3D printing service. Industrial parts, architecture models, student projects, medical models, creator props & corporate gifts — all printed with micron-level precision.
            </motion.p>

            <motion.p variants={item} className="mx-auto mb-7 max-w-[340px] font-[var(--font-mono)] text-[11px] leading-5 text-[var(--text-muted)] sm:max-w-[520px] sm:text-xs lg:mx-0">
              Powered by Bambu Lab P2S · Starting at ₹99 · Pan-India Delivery
            </motion.p>

            <motion.div variants={item} className="mb-4 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/instant-quote"
                  className="btn-primary flex min-h-[48px] items-center justify-center gap-2 px-5 py-3.5 text-center text-sm sm:px-6 sm:py-3"
                >
                  Upload Your Model & Get Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <a
                  href="#services"
                  className="btn-secondary flex min-h-[48px] items-center justify-center gap-2 px-5 py-3.5 text-sm sm:px-6 sm:py-3"
                >
                  View Our Work
                  <motion.span
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </motion.span>
                </a>
              </motion.div>
            </motion.div>

            <motion.p variants={item} className="text-center font-[var(--font-mono)] text-xs text-[var(--text-muted)] lg:text-left">
              No account needed · Free quote in 2 minutes · 500+ happy customers
            </motion.p>
          </motion.div>
        </div>

        <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[92vh] pointer-events-none" style={{ isolation: 'isolate' }}>
          <ImageAura />
          <div className="absolute inset-y-0 right-0 w-[140%] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(124, 92, 255,0.15)_0%,transparent_70%)] blur-2xl" />
          <motion.div
            className="relative h-full w-full"
            animate={{ y: [0, -10, 5, 0], x: [0, 8, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/pot.webp"
              alt="3D printed pot showcase"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 48vw"
              quality={75}
              className="object-contain object-right drop-shadow-2xl"
            />
          </motion.div>
        </div>

        <motion.div
          className="flex items-center justify-center px-4 max-md:mt-4 lg:hidden"
          initial={{ opacity: 1, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative w-full max-w-[280px] aspect-[3/4]">
            <Image
              src="/pot.webp"
              alt="3D printed pot showcase"
              fill
              priority
              sizes="280px"
              quality={75}
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </motion.div>

        <motion.div
          className="stats-row"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {stats.map((stat, i) => (
            <CountStat key={stat.label} stat={stat} index={i} />
          ))}
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
    </section>
  )
}
