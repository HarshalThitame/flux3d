'use client'

import Link from 'next/link'
import { motion, useInView, type Variants } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Sparkles, MessageCircle, Mail, Check } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const reassurancePills = [
  'Quote-based orders',
  'No fake pricing',
  'Real support contact',
  'Payment verified on server',
]

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const childVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

export default function FinalCTASection() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const email = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'

  return (
    <section ref={ref} className="relative overflow-hidden px-6 py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(109,40,217,0.08)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto max-w-[1000px]"
      >
        <div className="cta-banner p-10 md:p-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(109,40,217,0.2) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-[rgba(109,40,217,0.3)]" />

          <motion.div
            className="relative z-10"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'show' : 'hidden'}
          >
            <motion.div variants={childVariant} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#f3f0ff] px-4 py-1.5 text-sm font-medium text-[#6d28d9]">
              <Sparkles className="w-4 h-4" />
              Start with a real quote
            </motion.div>

            <motion.h2 variants={childVariant} className="mb-4 font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.1] text-[#1a1a1a]">
              Tell us what you need and we&apos;ll review it before production.
            </motion.h2>

            <motion.p variants={childVariant} className="mx-auto mb-8 max-w-[640px] text-lg leading-[1.6] text-[#4b4b4b]">
              Flux 3D handles custom 3D printing, prototyping, model printing and ready-made products through a review-and-confirm workflow. Share the file or requirement and we&apos;ll take it from there.
            </motion.p>

            <motion.div variants={childVariant} className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/contact" className="btn-primary group px-8 py-4 text-base">
                <span className="relative z-10 inline-flex items-center gap-2">
                  Contact Sales
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              <a
                href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary group px-8 py-4 text-base"
              >
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Us
                </span>
              </a>
            </motion.div>

            <motion.div variants={childVariant} className="mb-6 flex items-center justify-center gap-4">
              <div className="h-px w-12 bg-[rgba(109,40,217,0.25)]" />
              <span className="text-sm text-[#9ca3af]">or email us</span>
              <div className="h-px w-12 bg-[rgba(109,40,217,0.25)]" />
            </motion.div>

            <motion.a
              variants={childVariant}
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-[#4b4b4b] transition-colors hover:text-[#6d28d9]"
            >
              <Mail className="w-4 h-4" />
              {email}
            </motion.a>

            <motion.div variants={childVariant} className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {reassurancePills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e4df] bg-[#f3f0ff] px-3 py-1.5 text-xs text-[#4b4b4b]"
                >
                  <Check className="w-3 h-3" />
                  {pill}
                </span>
              ))}
            </motion.div>

            <motion.p variants={childVariant} className="mt-8 text-xs text-[#9ca3af]">
              Service delivery and payment terms are published on this site.
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
