'use client'

import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, CheckCircle2, MessageCircle, Sparkles } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const trustItems = ['No minimum order', 'Pan-India delivery', 'Material guidance', 'Quality checked']

export default function BottomCTA() {
  const { settings } = useBusinessSettings()
  const ref = useRef<HTMLElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const reduceMotion = useReducedMotion()
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')
  const businessName = settings.businessName || 'Flux3D'

  return (
    <section ref={ref} className="services-premium-section services-bottom-cta relative overflow-hidden bg-[#f9f7f4] px-4 pb-24 pt-24 md:px-8 lg:px-16">
      <div className="services-section-grid" aria-hidden="true" />
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent"
        animate={reduceMotion ? {} : { opacity: [0.35, 1, 0.35] }}
        transition={reduceMotion ? undefined : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="services-cta-panel relative z-10 mx-auto max-w-[1040px] overflow-hidden rounded-lg border border-purple-200 bg-white p-7 text-center shadow-sm md:p-12"
      >
        <motion.div
          animate={reduceMotion ? {} : { y: [0, -6, 0] }}
          transition={reduceMotion ? undefined : { duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#6d28d9] text-white"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </motion.div>

        <span className="mb-4 inline-flex items-center rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold uppercase text-[#6d28d9]">
          Ready when you are
        </span>
        <h2 className="mx-auto max-w-3xl !text-[clamp(2rem,6vw,3rem)] font-extrabold leading-tight !text-[#0F1B3D] md:!text-5xl">
          Send the file. Get the quote. Start the print.
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-[660px] text-sm leading-6 text-[#6b7280]">
          Whether it is one prototype or a repeatable batch, we will help you choose the right material, finish, and delivery path.
        </p>

        <div className="mb-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/instant-quote"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#6d28d9] px-8 text-sm font-bold text-white transition hover:bg-[#5b21b6]"
          >
            Get Instant Quote
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(businessName)}!%20I%20want%20to%20start%20a%203D%20printing%20project.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#25D366]/25 bg-[#25D366]/10 px-8 text-sm font-bold text-[#059669] transition hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.16]"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#6b7280]">
          {trustItems.map((item, index) => (
            <motion.span
              key={item}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.06 }}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {item}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
