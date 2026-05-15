'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Layers, MessageCircle, ChevronDown } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

function useParticles(count: number) {
  const [particles] = useState<Array<{
    left: number
    top: number
    width: number
    height: number
    duration: number
    delay: number
  }>>(() => Array.from({ length: count }).map(() => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    width: Math.random() * 3 + 1,
    height: Math.random() * 3 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  })))

  return particles
}

export default function MaterialsHero() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const particles = useParticles(20)

  return (
    <section ref={ref} className="relative overflow-hidden pt-32 pb-16 px-4 md:px-8 lg:px-16">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(124, 92, 255,0.12)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_60%,rgba(80,100,255,0.06)_0%,transparent_60%)]" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#7C5CFF]"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.width,
              height: p.height,
              opacity: 0.2
            }}
            animate={{ y: [0, -15, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="relative z-10 max-w-[1200px] mx-auto"
      >
        {/* Breadcrumb */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          className="flex items-center gap-2 text-sm text-[#6F7192] mb-6"
        >
          <Link href="/" className="hover:text-[#7C5CFF] transition-colors">Home</Link>
          <ChevronDown className="w-3 h-3 -rotate-90" />
          <span className="text-[#0F1B3D]">Materials</span>
        </motion.div>

        {/* Section label */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          className="inline-flex items-center gap-2 bg-[rgba(124, 92, 255,0.08)] border border-[rgba(124, 92, 255,0.3)] text-[#7C5CFF] text-sm font-medium px-4 py-1.5 rounded-full mb-4"
        >
          <Layers className="w-4 h-4" />
          Our Materials
        </motion.div>

        {/* H1 */}
        <motion.h1
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="font-[var(--font-syne)] text-[clamp(2rem,5vw,3.5rem)] font-extrabold text-[#0F1B3D] leading-[1.1] tracking-[-1px] mb-4"
        >
          The Right Material<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
            Makes All the Difference.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="text-[#6F7192] text-lg max-w-[700px] mb-8 leading-[1.7]"
        >
          Every project has a perfect material. We stock 10+ premium filaments and resins — from beginner-friendly PLA to engineering-grade Nylon and biocompatible resin. This guide helps you choose with confidence.
        </motion.p>

        {/* CTA pill */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="flex items-center gap-2 flex-wrap"
        >
          <a
            href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I'm%20not%20sure%20which%20material%20to%20choose%20for%20my%20project.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-5 py-2.5 text-sm font-medium text-[#25D366] transition-all hover:bg-[#25D366]/20 hover:border-[#25D366]/50"
          >
            <MessageCircle className="w-4 h-4" />
            Not sure? WhatsApp us for a recommendation
            <ArrowRight className="w-3 h-3" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
