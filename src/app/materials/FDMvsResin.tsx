'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export default function FDMvsResin() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="px-4 md:px-8 lg:px-16 py-20">
      <div className="max-w-[1000px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-10"
        >
          <span className="inline-block text-[#7C5CFF] text-xs font-semibold tracking-wider uppercase mb-2">
            Technology Guide
          </span>
          <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-[#0F1B3D] mb-2">
            FDM or Resin?<br />Here&apos;s How to Decide.
          </h2>
          <p className="text-[#6F7192] text-sm max-w-[600px] mx-auto">
            The two most common 3D printing technologies have very different strengths. Here&apos;s what you actually need to know — without the jargon.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FDM */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[#7C5CFF]/20 bg-[rgba(124, 92, 255,0.03)] p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C5CFF]/15 flex items-center justify-center">
                <span className="text-[#7C5CFF] font-bold text-sm">F</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F1B3D]">FDM Printing</h3>
                <p className="text-xs text-[#7C5CFF]">Strength, size, and affordability</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {[
                ['How It Works', 'Melts plastic filament, builds layer by layer'],
                ['Max Size', '256 × 256 × 256mm in one piece'],
                ['Detail Level', 'Good — visible layer lines at standard'],
                ['Strength', 'High — engineered plastics available'],
                ['Price', '₹8–₹18 per gram'],
                ['Materials', 'PLA+, PETG, ABS, ASA, TPU, Nylon, Silk, Multi-Color'],
                ['Post-Processing', 'Sanding, painting, acetone smoothing'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-[#6F7192] font-medium min-w-[100px]">{label}</span>
                  <span className="text-[#0F1B3D]">{value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-xs text-[#6F7192] mb-1">Ideal For:</p>
                <p className="text-[#0F1B3D]">Industrial parts, functional prototypes, architecture models, student projects, large prints, outdoor parts</p>
              </div>
            </div>
          </motion.div>

          {/* Resin */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-[#A78BFA]/20 bg-[rgba(80,100,255,0.03)] p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/15 flex items-center justify-center">
                <span className="text-[#7C5CFF] font-bold text-sm">R</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F1B3D]">Resin Printing</h3>
                <p className="text-xs text-[#7C5CFF]">Detail, surface finish, and precision</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {[
                ['How It Works', 'UV light cures liquid resin layer by layer'],
                ['Max Size', '218 × 123 × 260mm per print'],
                ['Detail Level', 'Exceptional — near invisible layer lines'],
                ['Strength', 'Moderate — more brittle than FDM'],
                ['Price', '₹18–₹35 per gram'],
                ['Materials', 'Standard, ABS-Like, Dental, Biocompatible'],
                ['Post-Processing', 'UV curing, alcohol wash, painting'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-[#6F7192] font-medium min-w-[100px]">{label}</span>
                  <span className="text-[#0F1B3D]">{value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-xs text-[#6F7192] mb-1">Ideal For:</p>
                <p className="text-[#0F1B3D]">Dental models, jewelry, miniatures, medical models, fine detail props, product presentation models</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-xl bg-[rgba(124, 92, 255,0.2)] border border-white/[0.06] p-4 text-center text-sm"
        >
          <span className="text-[#0F1B3D] font-medium">
            💡 When in doubt: If it needs to be strong — FDM. If it needs to look perfect — Resin. If it needs both — ABS-Like Resin or <span className="text-[#7C5CFF]">contact us</span>.
          </span>
        </motion.div>
      </div>
    </section>
  )
}
