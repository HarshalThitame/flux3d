'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { ArrowRight, ArrowDown, Printer, MapPin } from 'lucide-react'

function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2
      }))
    )
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

function BambuPrinterSVG() {
  return (
    <motion.svg
      viewBox="0 0 400 400"
      className="w-full max-w-[400px] mx-auto"
      style={{ contain: 'layout style paint' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <defs>
        <linearGradient id="printerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5C1A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF5C1A" stopOpacity="0" />
        </linearGradient>
        <filter id="printerGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Base/Enclosure */}
        <rect x="60" y="120" width="280" height="220" rx="16" fill="#0d1120" stroke="rgba(255,92,26,0.3)" strokeWidth="2" />

        {/* Front window */}
        <rect x="75" y="135" width="250" height="190" rx="10" fill="#050810" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        {/* Print bed */}
        <rect x="90" y="290" width="220" height="12" rx="3" fill="rgba(255,92,26,0.15)" stroke="rgba(255,92,26,0.2)" strokeWidth="1" />

        {/* Printed object growing upward from bed */}
        <rect x="170" y="250" width="60" height="40" rx="4" fill="url(#printerGlow)" filter="url(#printerGlowFilter)">
          <animate attributeName="height" values="0;40" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
          <animate attributeName="y" values="290;250" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
        </rect>

        {/* Top frame */}
        <rect x="55" y="100" width="290" height="20" rx="8" fill="#0d1120" stroke="rgba(255,92,26,0.3)" strokeWidth="2" />

        {/* AMS unit on top */}
        <rect x="100" y="40" width="200" height="55" rx="10" fill="#0d1120" stroke="rgba(255,92,26,0.3)" strokeWidth="2" />
        {[0, 1, 2, 3].map(i => (
          <motion.g key={i}>
            <rect x={115 + i * 48} y="52" width="36" height="36" rx="18" fill="rgba(255,92,26,0.08)" stroke="rgba(255,92,26,0.2)" strokeWidth="1" />
            <motion.circle
              cx={133 + i * 48}
              cy="70"
              r="4"
              fill={i === 0 ? '#FF5C1A' : i === 1 ? '#5064FF' : i === 2 ? '#10B981' : '#F59E0B'}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            />
          </motion.g>
        ))}

        {/* Vertical rails */}
        <line x1="85" y1="120" x2="85" y2="100" stroke="rgba(255,92,26,0.2)" strokeWidth="2" />
        <line x1="315" y1="120" x2="315" y2="100" stroke="rgba(255,92,26,0.2)" strokeWidth="2" />

        {/* Moving print head */}
        <motion.g
          animate={{ x: [-100, 120, -100] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Nozzle assembly */}
          <rect x="180" y="150" width="24" height="30" rx="4" fill="#0d1120" stroke="rgba(255,92,26,0.4)" strokeWidth="2" />
          <polygon points="185,180 199,180 195,188 189,188" fill="#FF5C1A" filter="url(#printerGlowFilter)" />
          {/* Hotend block */}
          <rect x="183" y="140" width="18" height="12" rx="2" fill="#FF5C1A" opacity="0.8" />
          {/* Heat break glow */}
          <motion.circle cx="192" cy="185" r="3" fill="#FF5C1A" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }} />
        </motion.g>

        {/* Status LEDs */}
        <motion.circle cx="85" cy="145" r="3" fill="#10B981" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.circle cx="85" cy="160" r="3" fill="#5064FF" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
        <motion.circle cx="85" cy="175" r="3" fill="#FF5C1A" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1 }} />

        {/* Logo area */}
        <text x="200" y="325" textAnchor="middle" fill="rgba(255,92,26,0.3)" fontSize="12" fontFamily="sans-serif" fontWeight="bold">
          Bambu Lab P2S
        </text>
      </motion.g>
    </motion.svg>
  )
}

const stats = [
  { value: '₹99', label: 'Prints Start At' },
  { value: '48hr', label: 'Express Turnaround' },
  { value: '500+', label: 'Orders Delivered' },
  { value: '10+', label: 'Materials in Stock' },
  { value: '19,000+', label: 'Pin Codes Delivered' }
]

const marqueeItems = [
  'IIT Bombay Students', 'Manufacturing Units', 'Dental Clinics', 'Architecture Firms',
  'YouTubers & Creators', 'Corporate HR Teams', 'Robotics Clubs', 'Interior Designers',
  'Medical Colleges', 'Gaming Enthusiasts', 'Pune Startups', 'Bangalore Engineers'
]

export default function HeroSection() {
  const heroRef = useRef(null)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 600], ['0%', '8%'])
  const opacity = useTransform(scrollY, [0, 500], [1, 0])

  return (
    <section ref={heroRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-24">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,92,26,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_60%,rgba(80,100,255,0.08)_0%,transparent_60%)]" />
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

      {/* Rotating ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-10"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-full h-full rounded-full border border-dashed border-[#FF5C1A]" />
      </motion.div>

      <motion.div className="relative z-10 max-w-[1200px] mx-auto px-4 py-6 w-full sm:px-6 sm:py-8" style={{ y, opacity }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            {/* Pre-badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-[rgba(255,92,26,0.08)] border border-[rgba(255,92,26,0.3)] text-[#FF5C1A] text-sm font-medium px-4 py-1.5 rounded-full mb-3"
            >
              <Printer className="w-4 h-4" />
              Now Printing on Bambu Lab P2S
            </motion.div>

            {/* India badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="inline-flex items-center gap-1.5 text-[#7a82a0] text-sm ml-2"
            >
              <MapPin className="w-3.5 h-3.5" />
              Proudly Made in India
            </motion.div>

            {/* H1 */}
             <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-[var(--font-syne)] text-[clamp(1.8rem,7vw,3.2rem)] font-extrabold text-white leading-[1.1] tracking-[-1px] mb-3 mt-3"
            >
              Where Ideas Become{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C1A] to-[#ff7a3d] animate-gradient">
                Reality
              </span>
              <br />
              <span className="text-[#7a82a0] font-normal text-[clamp(1rem,2.5vw,1.6rem)]">
                Layer by Layer.
              </span>
            </motion.h1>

            {/* H2 / Subheadline */}
             <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-[#7a82a0] max-w-[520px] mx-auto lg:mx-0 mb-3 leading-[1.6] px-2 sm:px-0"
            >
              India&apos;s most trusted 3D printing service. Industrial parts, architecture models, student projects, medical models, creator props & corporate gifts — all printed with micron-level precision.
            </motion.p>

            {/* Supporting line */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-xs text-[#4a5070] max-w-[520px] mx-auto lg:mx-0 mb-6"
            >
              Powered by Bambu Lab P2S · Starting at ₹99 · Pan-India Delivery
            </motion.p>

            {/* CTAs */}
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4"
            >
              <Link
                href="/instant-quote"
                className="group relative bg-[#FF5C1A] text-white px-5 py-3.5 sm:px-6 sm:py-3 rounded-xl text-sm font-semibold border-none cursor-pointer overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(255,92,26,0.3)] text-center min-h-[48px] flex items-center justify-center"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Upload Your Model & Get Quote
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <a
                href="#services"
                className="inline-flex items-center justify-center gap-2 bg-transparent text-white px-5 py-3.5 sm:px-6 sm:py-3 rounded-xl text-sm font-medium border border-[rgba(255,255,255,0.1)] cursor-pointer transition-all hover:border-[rgba(255,92,26,0.4)] hover:bg-[rgba(255,92,26,0.05)] min-h-[48px]"
              >
                View Our Work
                <ArrowDown className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Trust micro-line */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-xs text-[#4a5070] text-center lg:text-left"
            >
              No account needed · Free quote in 2 minutes · 500+ happy customers
            </motion.p>
          </div>

          {/* Right: SVG Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative hidden lg:block"
            style={{ isolation: 'isolate' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,92,26,0.15)_0%,transparent_70%)] blur-2xl" />
            <BambuPrinterSVG />
          </motion.div>
        </div>

         {/* Stats row */}
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
           className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-8 sm:mt-10"
         >
          {stats.map((stat, i) => (
               <motion.div
                key={i}
                className="bg-[rgba(13,17,32,0.6)] border border-white/[0.07] rounded-xl p-3 sm:p-4 text-center group hover:border-[rgba(255,92,26,0.3)] transition-colors"
                whileHover={{ scale: 1.03, y: -4 }}
              >
                <div className="font-[var(--font-syne)] text-lg sm:text-xl font-extrabold text-[#FF5C1A]">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs text-[#7a82a0] mt-0.5">{stat.label}</div>
              </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050810] to-transparent pointer-events-none" />
    </section>
  )
}
