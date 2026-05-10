'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const services = [
  {
    icon: '🪵',
    title: 'Sanding & Smoothing',
    body: 'Hand-sanded to 400–2000 grit for a silky smooth surface. Removes all visible layer lines.',
    available: 'PLA+, ABS, PETG, Silk PLA, Resin',
    price: 'From ₹199',
  },
  {
    icon: '🎨',
    title: 'Painting & Priming',
    body: 'White or grey primer coat, followed by acrylic painting in your specified colors. Professional hand-painting or spray finish.',
    available: 'All FDM · All Resin',
    price: 'From ₹299',
  },
  {
    icon: '✨',
    title: 'Acetone Smoothing',
    body: 'Acetone vapor treatment produces a high-gloss, injection-molded surface finish on ABS parts. Eliminates layer lines completely.',
    available: 'ABS only',
    price: 'From ₹249',
  },
  {
    icon: '🔩',
    title: 'Hardware Inserts',
    body: 'Brass heat-set threaded inserts pressed into your print for strong, reusable screw connections. M2 to M8 sizes.',
    available: 'All FDM materials',
    price: '₹25 per insert',
  },
  {
    icon: '🧲',
    title: 'Magnet Embedding',
    body: 'Neodymium magnets embedded inside your print during or after printing. Perfect for magnetic enclosures and display fixtures.',
    available: 'All materials',
    price: '₹35 per magnet',
  },
  {
    icon: '📦',
    title: 'Premium Gift Packaging',
    body: 'Matte black gift box with foam padding and Flux 3D branded tissue paper. Ideal for corporate gifts and trophies.',
    available: 'All prints',
    price: '₹49 per unit',
  },
]

export default function PostProcessing() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="px-4 md:px-8 lg:px-16 py-20">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <span className="inline-block text-[#7C5CFF] text-xs font-semibold tracking-wider uppercase mb-2">
            Finishing Services
          </span>
          <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-[#0F1B3D] mb-2">
            We Don't Just Print.<br />We Finish.
          </h2>
          <p className="text-[#6F7192] text-sm max-w-[600px] mx-auto">
            Raw prints are great. Finished prints are impressive. We offer post-processing services to take your print from good to gallery-worthy.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/[0.06] bg-[rgba(255,255,255,0.72)] p-5 hover:border-[rgba(124, 92, 255,0.2)] transition-colors group"
            >
              <span className="text-2xl mb-3 block">{s.icon}</span>
              <h3 className="text-[#0F1B3D] font-semibold mb-2 group-hover:text-[#7C5CFF] transition-colors">{s.title}</h3>
              <p className="text-sm text-[#6F7192] mb-3 leading-relaxed">{s.body}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4a5070]">For: {s.available}</span>
                <span className="text-[#7C5CFF] font-semibold">{s.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
