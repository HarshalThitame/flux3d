'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

function FloatingOrbs() {
  const [orbs] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number }>>(
    () => Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 30,
      duration: Math.random() * 4 + 3
    }))
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map(orb => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full bg-[#7C5CFF] blur-3xl"
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
    <section ref={ref} className="py-24 px-6 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(124, 92, 255,0.08)_0%,transparent_70%)] pointer-events-none" />
      <FloatingOrbs />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-[900px] mx-auto relative z-10"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7C5CFF] via-[#7C5CFF] to-[#A78BFA] p-10 md:p-16 text-center card-depth-lg">
          {/* Animated dot pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '28px 28px'
            }}
          />

          {/* Rotating border glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent, rgba(255,255,255,0.3), transparent)',
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
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-[#0F1B3D] text-sm font-medium px-4 py-1.5 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Let&apos;s Build Something Amazing
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1] mb-4"
            >
              Ready to Bring Your <br />
              Idea to Life?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-lg text-[#0F1B3D]/90 max-w-[600px] mx-auto mb-8 leading-[1.6]"
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
                className="group relative bg-white text-[#7C5CFF] px-8 py-4 rounded-xl text-base font-semibold border-none cursor-pointer overflow-hidden transition-all hover:shadow-[0_10px_40px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
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
                className="group bg-white/10 backdrop-blur-sm text-[#0F1B3D] px-8 py-4 rounded-xl text-base font-medium border border-[#7C5CFF]/10 cursor-pointer transition-all hover:bg-white/20 hover:border-[#7C5CFF]/10 hover:-translate-y-0.5"
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
              className="flex flex-wrap items-center justify-center gap-6 mt-10 text-[#0F1B3D]/70 text-sm"
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
