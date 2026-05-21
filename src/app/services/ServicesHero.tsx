'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, CheckCircle2, Layers3, MessageCircle, Ruler, ShieldCheck, Sparkles } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const stats = [
  { value: '±0.1mm', label: 'Print accuracy' },
  { value: '10+', label: 'Material options' },
  { value: '3-5d', label: 'Typical delivery' },
  { value: 'Pan-India', label: 'Shipping coverage' },
]

const capabilities = [
  { icon: ShieldCheck, label: 'Functional parts' },
  { icon: Ruler, label: 'Architectural models' },
  { icon: Sparkles, label: 'Premium finishing' },
]

export default function ServicesHero() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')

  return (
    <section ref={ref} className="relative overflow-hidden px-4 pb-14 pt-6 md:px-8 lg:px-16">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#F7F8FB_0%,#FFFFFF_58%,#F7F8FB_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6d28d9]/30 to-transparent" />

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
        }}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="relative z-10 mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.78fr)] lg:items-center"
      >
        <div className="min-w-0">
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/15 bg-white px-4 py-2 text-xs font-bold uppercase text-[#6d28d9] shadow-sm"
          >
            <Layers3 className="h-4 w-4" />
            Premium 3D printing services
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="max-w-4xl text-4xl font-extrabold leading-[1.05] text-[#111827] sm:text-5xl lg:text-6xl"
          >
            Precision 3D printing for parts that need to look and perform right.
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="mt-6 max-w-2xl text-base leading-8 text-[#4B5563] sm:text-lg"
          >
            From industrial prototypes to presentation models and branded products, Flux3D manages material selection, print planning, finishing, and delivery with a production-minded workflow.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/instant-quote"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#111827] px-6 text-sm font-bold text-white shadow-[0_16px_36px_rgba(17,24,39,0.18)] transition hover:bg-[#2f3341]"
            >
              Get Instant Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20want%20to%20discuss%20a%203D%20printing%20project.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#25D366]/25 bg-white px-6 text-sm font-bold text-[#138a42] shadow-sm transition hover:border-[#25D366]/40 hover:bg-[#EAFBF2]"
            >
              <MessageCircle className="h-4 w-4" />
              Discuss Project
            </a>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="mt-8 grid gap-3 sm:grid-cols-3"
          >
            {capabilities.map((item) => (
              <div key={item.label} className="flex min-h-14 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 shadow-sm">
                <item.icon className="h-4 w-4 shrink-0 text-[#6d28d9]" />
                <span className="text-sm font-semibold leading-5 text-[#374151]">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
          className="relative"
        >
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_24px_70px_rgba(17,24,39,0.14)]">
            <div className="relative aspect-[4/5] overflow-hidden bg-[#111827] sm:aspect-[16/11] lg:aspect-[4/5]">
              <video
                className="h-full w-full object-cover opacity-90"
                src="/printer.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#111827] via-[#111827]/70 to-transparent p-5 text-white">
                <p className="text-xs font-bold uppercase text-white/60">Live production workflow</p>
                <h2 className="mt-2 text-2xl font-extrabold">From file to finished part.</h2>
                <div className="mt-4 grid gap-2">
                  {['Material guidance', 'Print orientation review', 'Finish and delivery planning'].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm font-semibold text-white/90">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="lg:col-span-2"
        >
          <div className="grid overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="border-b border-gray-100 p-5 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <div className="text-2xl font-extrabold text-[#111827]">{stat.value}</div>
                <div className="mt-1 text-xs font-bold uppercase text-[#6F7192]">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
