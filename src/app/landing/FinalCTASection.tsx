'use client'

import Link from 'next/link'
import { motion, useInView } from '@/lib/motion'
import { useRef, useState } from 'react'
import { ArrowRight, Sparkles, MessageCircle, Mail, Check } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

function FloatingOrbs() {
  const [orbs] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number }>>(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 80 + 40,
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

const reassurancePills = [
  'Free Quote',
  'No Minimum Order',
  '24hr Express Available',
  'Reply in 30 Minutes'
]

export default function FinalCTASection() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      <FloatingOrbs />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(124, 92, 255,0.08)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-[1000px] mx-auto relative z-10"
      >
        <div className="relative overflow-hidden rounded-3xl border border-[rgba(124,92,255,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,242,255,0.92))] p-10 md:p-16 text-center card-depth-lg">
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

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-[#0F1B3D] text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-[rgba(124,92,255,0.12)]"
            >
              <Sparkles className="w-4 h-4" />
              Get Started
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
            className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1] mb-4"
            >
              Your Next Great Idea Deserves <br />
              to Exist in the Real World.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-lg text-[#4a5070] max-w-[600px] mx-auto mb-8 leading-[1.6]"
            >
              Upload your file and get a quote in under 2 minutes. No account needed. No commitment required. Just the fastest path from idea to object.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
            >
              <Link
                href="/instant-quote"
                className="group relative bg-[#7C5CFF] text-white px-8 py-4 rounded-xl text-base font-semibold border border-[#7C5CFF]/20 cursor-pointer overflow-hidden transition-all hover:shadow-[0_10px_40px_rgba(124,92,255,0.18)] hover:-translate-y-0.5"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Upload Your File & Get a Free Quote
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white/70 backdrop-blur-sm text-[#0F1B3D] px-8 py-4 rounded-xl text-base font-medium border border-[#7C5CFF]/10 cursor-pointer transition-all hover:bg-white hover:border-[#7C5CFF]/20 hover:-translate-y-0.5"
              >
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Us Your Idea
                </span>
              </Link>
            </motion.div>

            {/* OR divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <div className="w-12 h-px bg-[rgba(124,92,255,0.25)]" />
              <span className="text-[#6F7192] text-sm">or email us</span>
              <div className="w-12 h-px bg-[rgba(124,92,255,0.25)]" />
            </motion.div>

            <motion.a
              href={`mailto:${settings.primaryEmail || 'hello@flux3d.in'}`}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="inline-flex items-center gap-2 text-[#6F7192] hover:text-[#0F1B3D] transition-colors"
            >
              <Mail className="w-4 h-4" />
              {settings.primaryEmail || 'hello@flux3d.in'}
            </motion.a>

            {/* Reassurance pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap items-center justify-center gap-3 mt-8"
            >
              {reassurancePills.map((pill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm text-[#0F1B3D] text-xs px-3 py-1.5 rounded-full border border-[rgba(124,92,255,0.12)]"
                >
                  <Check className="w-3 h-3" />
                  {pill}
                </span>
              ))}
            </motion.div>

            {/* Bottom trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.9 }}
              className="text-[#6F7192] text-xs mt-8"
            >
              Delivering across India · Bambu Lab P2S · Est. 2024
            </motion.p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
