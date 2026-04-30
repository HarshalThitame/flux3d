'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#FF5C1A]"
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
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <defs>
        <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5C1A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FF5C1A" stopOpacity="0" />
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
        <rect x="40" y="60" width="120" height="80" rx="8" fill="#0d1120" stroke="rgba(255,92,26,0.3)" strokeWidth="2" />

        {/* Print bed */}
        <rect x="50" y="115" width="100" height="8" rx="2" fill="rgba(255,92,26,0.15)" />

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
          <rect x="0" y="30" width="12" height="25" rx="2" fill="#FF5C1A" />
          <polygon points="0,55 12,55 8,62 4,62" fill="#FF5C1A" />
        </motion.g>

        {/* Top frame */}
        <rect x="35" y="20" width="130" height="10" rx="3" fill="#0d1120" stroke="rgba(255,92,26,0.3)" strokeWidth="2" />

        {/* Vertical rails */}
        <line x1="45" y1="30" x2="45" y2="60" stroke="rgba(255,92,26,0.2)" strokeWidth="2" />
        <line x1="155" y1="30" x2="155" y2="60" stroke="rgba(255,92,26,0.2)" strokeWidth="2" />

        {/* Status light */}
        <motion.circle
          cx="150"
          cy="70"
          r="3"
          fill="#FF5C1A"
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
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Layered backgrounds */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,92,26,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_60%,rgba(80,100,255,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_90%,rgba(255,92,26,0.06)_0%,transparent_60%)]" />
      </div>

      {/* Grid overlay */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
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
        <div className="w-full h-full rounded-full border border-dashed border-[#FF5C1A]" />
      </motion.div>

      <motion.div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 md:py-20 w-full" style={{ y, opacity }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-[rgba(255,92,26,0.08)] border border-[rgba(255,92,26,0.3)] text-[#FF5C1A] text-sm font-medium px-4 py-1.5 rounded-full mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF5C1A] animate-pulse-dot" />
              7 Specialized Services
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-[var(--font-syne)] text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold text-white leading-[1.1] tracking-[-1px] mb-6"
            >
              We Print What <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C1A] to-[#ff7a3d] animate-gradient">
                Others Can&apos;t
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-[#7a82a0] max-w-[500px] mx-auto lg:mx-0 mb-8 leading-[1.7]"
            >
              From industrial spare parts and medical models to student projects and creator props — precision prints across India using Bambu Lab P2S fleet.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/instant-quote"
                className="group relative bg-[#FF5C1A] text-white px-8 py-3.5 rounded-xl text-base font-semibold border-none cursor-pointer overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(255,92,26,0.3)]"
              >
                <span className="relative z-10">Get A Free Quote</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#ff7a3d] to-[#FF5C1A] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/materials"
                className="bg-transparent text-white px-8 py-3.5 rounded-xl text-base font-medium border border-[rgba(255,255,255,0.1)] cursor-pointer transition-all hover:border-[rgba(255,92,26,0.4)] hover:bg-[rgba(255,92,26,0.05)]"
              >
                See Materials
              </Link>
            </motion.div>
          </div>

          {/* Right: SVG Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,92,26,0.15)_0%,transparent_70%)] blur-2xl" />
            <PrinterSVG />
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="bg-[rgba(13,17,32,0.6)] border border-white/[0.07] rounded-2xl p-6 text-center group hover:border-[rgba(255,92,26,0.3)] transition-colors"
              whileHover={{ scale: 1.03, y: -4 }}
            >
              <div className="font-[var(--font-syne)] text-3xl md:text-4xl font-extrabold text-white">
                {stat.prefix}{stat.value}<span className="text-[#FF5C1A]">{stat.unit}</span>
              </div>
              <div className="text-sm text-[#7a82a0] mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050810] to-transparent pointer-events-none" />
    </section>
  )
}
