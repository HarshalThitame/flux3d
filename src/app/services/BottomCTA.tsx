'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const serviceCtaOrbs = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x: (i * 23 + 14) % 100,
  y: (i * 41 + 8) % 100,
  size: 34 + (i % 4) * 12,
  duration: 3 + (i % 3) * 0.8,
}))

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {serviceCtaOrbs.map(orb => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full bg-white blur-3xl"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            opacity: 0.08
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            opacity: [0.05, 0.12, 0.05]
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

export default function BottomCTA() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative overflow-hidden px-6 py-24">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(124,58,237,0.12)_0%,transparent_70%)]" />
      <FloatingOrbs />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-[900px] mx-auto relative z-10"
      >
        <div className="cta-banner p-10 md:p-16">
          {/* Animated dot pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.22) 1px, transparent 0)`,
              backgroundSize: '28px 28px'
            }}
          />

          {/* Rotating border glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(124,58,237,0.55), transparent, rgba(6,182,212,0.45), transparent)',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              padding: 2
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Content */}
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.08em] text-white backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4" />
              Let&apos;s Build Something Amazing
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="mb-4 font-[var(--font-syne)] text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold leading-[1.1] text-white"
            >
              Ready to Bring Your <br />
              <span className="text-white">Idea to Life?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="mx-auto mb-8 max-w-[600px] text-lg leading-[1.6] text-white/80"
            >
              Whether it is a quick prototype or a full production run, we are here to make it happen fast, precise, and presentation-ready.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/instant-quote"
                className="btn-primary group relative px-8 py-4 text-base"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Get A Free Quote
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary group px-8 py-4 text-base"
              >
                <span className="inline-flex items-center gap-2">
                  Chat on WhatsApp
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-6 font-[var(--font-mono)] text-xs uppercase tracking-[0.08em] text-white/75"
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                No minimum order
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                Pan-India delivery
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                3-5 day turnaround
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
