'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, type ComponentType } from 'react'
import { Box, Drill, Gift, Magnet, Paintbrush, Sparkles } from 'lucide-react'

const services = [
  {
    icon: Sparkles,
    title: 'Sanding & Smoothing',
    body: 'Hand-sanded to 400–2000 grit for a silky smooth surface. Removes all visible layer lines.',
    available: 'PLA+, ABS, PETG, Silk PLA, Resin',
    price: 'From ₹199',
  },
  {
    icon: Paintbrush,
    title: 'Painting & Priming',
    body: 'White or grey primer coat, followed by acrylic painting in your specified colors. Professional hand-painting or spray finish.',
    available: 'All FDM · All Resin',
    price: 'From ₹299',
  },
  {
    icon: Box,
    title: 'Acetone Smoothing',
    body: 'Acetone vapor treatment produces a high-gloss, injection-molded surface finish on ABS parts. Eliminates layer lines completely.',
    available: 'ABS only',
    price: 'From ₹249',
  },
  {
    icon: Drill,
    title: 'Hardware Inserts',
    body: 'Brass heat-set threaded inserts pressed into your print for strong, reusable screw connections. M2 to M8 sizes.',
    available: 'All FDM materials',
    price: '₹25 per insert',
  },
  {
    icon: Magnet,
    title: 'Magnet Embedding',
    body: 'Neodymium magnets embedded inside your print during or after printing. Perfect for magnetic enclosures and display fixtures.',
    available: 'All materials',
    price: '₹35 per magnet',
  },
  {
    icon: Gift,
    title: 'Premium Gift Packaging',
    body: 'Matte black gift box with foam padding and Flux 3D branded tissue paper. Ideal for corporate gifts and trophies.',
    available: 'All prints',
    price: '₹49 per unit',
  },
] satisfies Array<{
  icon: ComponentType<{ className?: string }>
  title: string
  body: string
  available: string
  price: string
}>

export default function PostProcessing() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="materials-premium-section materials-finishing-section relative overflow-hidden px-4 py-20 md:px-8 lg:px-16">
      <div className="materials-section-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-10 text-center"
        >
          <span className="mb-2 inline-block text-xs font-bold uppercase text-[#6d28d9]">
            Finishing Services
          </span>
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold text-[#111827] md:text-4xl">
            Premium finish options, matched to your material.
          </h2>
          <p className="mx-auto mt-3 max-w-[620px] text-sm leading-6 text-[#6F7192]">
            Raw prints are great. Finished prints are impressive. We offer post-processing services to take your print from good to gallery-worthy.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08 }}
              className="materials-finish-card group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#6d28d9]/25 hover:shadow-[0_20px_60px_rgba(17,24,39,0.10)]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#6d28d9]">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-[#111827] transition-colors group-hover:text-[#6d28d9]">{s.title}</h3>
              <p className="mb-4 min-h-[72px] text-sm leading-6 text-[#6F7192]">{s.body}</p>
              <div className="flex items-end justify-between gap-4 border-t border-gray-100 pt-4 text-xs">
                <span className="font-semibold leading-5 text-[#4B5563]">For: {s.available}</span>
                <span className="shrink-0 font-extrabold text-[#6d28d9]">{s.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
