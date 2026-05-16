'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Sparkles, MessageCircle, Mail, Check } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const finalCtaOrbs = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: (i * 31 + 9) % 100,
  y: (i * 43 + 21) % 100,
  size: 44 + (i % 5) * 11,
  duration: 3 + (i % 4) * 0.7,
}))

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {finalCtaOrbs.map(orb => (
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
        <div className="cta-banner p-10 md:p-16">
          {/* Animated dot pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)`,
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
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4" />
              Get Started
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
            className="mb-4 font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.1] text-white"
            >
              Your Next Great Idea Deserves <br />
              to Exist in the Real World.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="mx-auto mb-8 max-w-[600px] text-lg leading-[1.6] text-white/80"
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
                className="btn-primary group px-8 py-4 text-base"
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
                className="btn-secondary group px-8 py-4 text-base"
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
              <span className="text-sm text-white/70">or email us</span>
              <div className="w-12 h-px bg-[rgba(124,92,255,0.25)]" />
            </motion.div>

            <motion.a
              href={`mailto:${settings.primaryEmail || 'hello@flux3d.in'}`}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="inline-flex items-center gap-2 text-white/75 transition-colors hover:text-white"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
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
              className="mt-8 text-xs text-white/65"
            >
              Delivering across India · Bambu Lab P2S · Est. 2024
            </motion.p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
