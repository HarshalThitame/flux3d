'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { ArrowRight, Sparkles, MessageCircle, Mail, Check } from 'lucide-react'

function FloatingOrbs() {
  const [orbs, setOrbs] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number }>>([])

  useEffect(() => {
    setOrbs(
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 80 + 40,
        duration: Math.random() * 4 + 3
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map(orb => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full bg-[#FF5C1A] blur-3xl"
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
  'GST Invoice',
  '24hr Express Available',
  'Reply in 30 Minutes'
]

export default function FinalCTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      <FloatingOrbs />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(255,92,26,0.08)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-[1000px] mx-auto relative z-10"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF5C1A] via-[#ff6b2b] to-[#ff7a3d] p-10 md:p-16 text-center">
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
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Get Started
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1] mb-4"
            >
              Your Next Great Idea Deserves <br />
              to Exist in the Real World.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-lg text-white/90 max-w-[600px] mx-auto mb-8 leading-[1.6]"
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
                className="group relative bg-white text-[#FF5C1A] px-8 py-4 rounded-xl text-base font-semibold border-none cursor-pointer overflow-hidden transition-all hover:shadow-[0_10px_40px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Upload Your File & Get a Free Quote
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                href="https://wa.me/919623023480"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl text-base font-medium border border-white/30 cursor-pointer transition-all hover:bg-white/20 hover:border-white/50 hover:-translate-y-0.5"
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
              <div className="w-12 h-px bg-white/30" />
              <span className="text-white/60 text-sm">or email us</span>
              <div className="w-12 h-px bg-white/30" />
            </motion.div>

            <motion.a
              href="mailto:hello@flux3d.in"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4" />
              hello@flux3d.in
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
                  className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/80 text-xs px-3 py-1.5 rounded-full"
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
              className="text-white/50 text-xs mt-8"
            >
              Delivering across India · Bambu Lab P2S · Est. 2024
            </motion.p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
