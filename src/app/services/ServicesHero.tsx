'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

const serviceParticles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 17) % 100,
  size: 1 + (i % 4) * 0.6,
  duration: 2 + (i % 5) * 0.45,
  delay: (i % 7) * 0.2,
}))

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {serviceParticles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[var(--brand-primary)]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: 0.3
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.1, 0.4, 0.1]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

function PrinterSVG() {
  return (
    <motion.svg
      viewBox="0 0 200 160"
      className="w-full max-w-[320px] mx-auto"
      style={{ contain: 'layout style paint' }}
      initial={{ opacity: 1, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <defs>
        <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
        </linearGradient>
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Printer body */}
        <rect x="40" y="60" width="120" height="80" rx="8" fill="#FFFFFF" stroke="rgba(124, 92, 255,0.3)" strokeWidth="2" />

        {/* Print bed */}
        <rect x="50" y="115" width="100" height="8" rx="2" fill="rgba(124, 92, 255,0.15)" />

        {/* Printed object (growing) */}
        <motion.rect
          x="85"
          y="115"
          width="30"
          height="0"
          fill="url(#glow)"
          filter="url(#glow-filter)"
          animate={{ height: [0, 25, 25] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Nozzle */}
        <motion.g
          animate={{ x: [60, 140, 60] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="0" y="30" width="12" height="25" rx="2" fill="#7C5CFF" />
          <polygon points="0,55 12,55 8,62 4,62" fill="#7C5CFF" />
        </motion.g>

        {/* Top frame */}
        <rect x="35" y="20" width="130" height="10" rx="3" fill="#FFFFFF" stroke="rgba(124, 92, 255,0.3)" strokeWidth="2" />

        {/* Vertical rails */}
        <line x1="45" y1="30" x2="45" y2="60" stroke="rgba(124, 92, 255,0.2)" strokeWidth="2" />
        <line x1="155" y1="30" x2="155" y2="60" stroke="rgba(124, 92, 255,0.2)" strokeWidth="2" />

        {/* Status light */}
        <motion.circle
          cx="150"
          cy="70"
          r="3"
          fill="#7C5CFF"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.g>
    </motion.svg>
  )
}

const stats = [
  { value: '0.1', unit: 'mm', label: 'Print Accuracy', suffix: '±' },
  { value: '256', unit: '³', label: 'Build Volume (mm)', prefix: '', suffix: '' },
  { value: '10', unit: '+', label: 'Materials Available', suffix: '' },
  { value: 'Pan', unit: '-IN', label: 'India Delivery', suffix: '' }
]

export default function ServicesHero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <section ref={ref} className="dot-grid-bg relative flex min-h-screen items-center justify-center overflow-hidden pt-24">
      <div className="hero-glow hero-glow-1" />
      <div className="hero-glow hero-glow-2" />
      {/* Layered backgrounds */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(124,58,237,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_60%,rgba(6,182,212,0.08)_0%,transparent_60%)]" />
      </div>

      {/* Grid overlay */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 92, 255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 92, 255,0.25) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 70%)'
        }}
      />

      <FloatingParticles />

      {/* Rotating ring decoration */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-full h-full rounded-full border border-dashed border-[#7C5CFF]" />
      </motion.div>

      <motion.div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 md:py-20 w-full" style={{ y, opacity }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="hero-badge"
            >
              <motion.span
                className="badge-dot"
                animate={{ opacity: [1, 0.45, 1], scale: [1, 0.82, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              7 Specialized Services
            </motion.div>

            <motion.h1
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.2rem)] font-extrabold leading-[1.08] text-[var(--text-primary)]"
            >
              We Print What <br />
              <span className="gradient-text">
                Others Can&apos;t
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mb-8 max-w-[520px] text-lg leading-[1.7] text-[var(--text-secondary)] lg:mx-0"
            >
              From industrial spare parts and medical models to student projects and creator props — precision prints across India using Bambu Lab P2S fleet.
            </motion.p>

            <motion.div
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/instant-quote"
                className="btn-primary group relative px-8 py-3.5 text-base"
              >
                <span className="relative z-10">Get A Free Quote</span>
              </Link>
              <Link
                href="/materials"
                className="btn-secondary px-8 py-3.5 text-base"
              >
                See Materials
              </Link>
            </motion.div>
          </div>

          {/* Right: SVG Animation */}
          <motion.div
            initial={{ opacity: 1, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(124, 92, 255,0.15)_0%,transparent_70%)] blur-2xl" />
            <PrinterSVG />
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 1, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="card p-6 text-center"
              whileHover={{ scale: 1.03, y: -4 }}
            >
              <div className="font-[var(--font-syne)] text-3xl font-extrabold text-[var(--text-primary)] md:text-4xl">
                {stat.prefix}{stat.value}<span className="gradient-text">{stat.unit}</span>
              </div>
              <div className="mt-1 font-[var(--font-mono)] text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
    </section>
  )
}
