'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  Layers,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const materialHighlights = [
  { label: 'PLA+', value: 'Clean prototypes', tone: 'bg-[#ede9fe] text-[#5b21b6]' },
  { label: 'PETG', value: 'Balanced strength', tone: 'bg-[#dff7ef] text-[#047857]' },
  { label: 'ABS', value: 'Heat-ready parts', tone: 'bg-[#fff3d6] text-[#9a5b00]' },
  { label: 'Resin', value: 'Fine detail', tone: 'bg-[#eef2ff] text-[#3730a3]' },
]

const heroStats = [
  { icon: Layers, label: '10+ stocked materials' },
  { icon: ShieldCheck, label: 'Dried, tested batches' },
  { icon: Ruler, label: 'FDM and resin guidance' },
]

export default function MaterialsHero() {
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
        className="relative z-10 mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)] lg:items-center"
      >
        <div className="min-w-0">
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="mb-5 flex items-center gap-2 text-sm font-medium text-[#6F7192]"
          >
            <Link href="/" className="transition hover:text-[#6d28d9]">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#111827]">Materials</span>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/15 bg-white px-4 py-2 text-xs font-bold uppercase text-[#6d28d9] shadow-sm"
          >
            <FlaskConical className="h-4 w-4" />
            Material intelligence
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="max-w-4xl text-4xl font-extrabold leading-[1.05] text-[#111827] sm:text-5xl lg:text-6xl"
          >
            Choose the material that makes your print feel engineered.
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="mt-6 max-w-2xl text-base leading-8 text-[#4B5563] sm:text-lg"
          >
            Compare finish, strength, heat resistance, flexibility, and cost before you upload. Flux3D pairs each job with a material that fits the part, not just the printer.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/instant-quote"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111827] px-6 text-sm font-bold text-white shadow-[0_16px_36px_rgba(17,24,39,0.18)] transition hover:bg-[#2f3341]"
            >
              Upload File
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20need%20help%20choosing%20a%20material%20for%20my%20project.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#25D366]/25 bg-white px-6 text-sm font-bold text-[#138a42] shadow-sm transition hover:border-[#25D366]/40 hover:bg-[#EAFBF2]"
            >
              <MessageCircle className="h-4 w-4" />
              Ask Material Expert
            </a>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="mt-8 grid gap-3 sm:grid-cols-3"
          >
            {heroStats.map((item) => (
              <div key={item.label} className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
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
          <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_rgba(17,24,39,0.12)]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase text-[#6d28d9]">Material shortlist</p>
                <h2 className="mt-1 text-xl font-extrabold text-[#111827]">What matters most?</h2>
              </div>
              <Sparkles className="h-5 w-5 text-[#f59e0b]" />
            </div>

            <div className="mt-5 space-y-3">
              {materialHighlights.map((material) => (
                <div key={material.label} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-[#FAFBFD] px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-[#111827]">{material.label}</div>
                    <div className="mt-0.5 truncate text-xs font-medium text-[#6F7192]">{material.value}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${material.tone}`}>
                    Ready
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-[#111827] p-4 text-white">
              <p className="text-xs font-semibold uppercase text-white/60">Selection rule</p>
              <p className="mt-2 text-sm leading-6 text-white/90">
                Strong parts start with PETG, ABS, ASA, or Nylon. Display pieces start with PLA+, Silk PLA, or Resin.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
