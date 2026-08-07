'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Box, Diamond, Info } from 'lucide-react'

export default function FDMvsResin() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="materials-premium-section materials-tech-section relative overflow-hidden px-4 py-20 md:px-8 lg:px-16">
      <div className="materials-section-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1100px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-10 text-center"
        >
          <span className="mb-2 inline-block text-xs font-bold uppercase text-[#6d28d9]">
            Technology Guide
          </span>
          <h2 className="mx-auto max-w-2xl text-[clamp(2rem,6vw,3rem)] font-extrabold text-[#070b1d] md:text-4xl">
            FDM or resin? Decide by outcome.
          </h2>
          <p className="mx-auto mt-3 max-w-[640px] text-sm leading-6 text-[#6F7192]">
            The two most common 3D printing technologies have very different strengths. Here&apos;s what you actually need to know — without the jargon.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="materials-tech-card rounded-lg border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)]"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#6d28d9]">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#070b1d]">FDM Printing</h3>
                <p className="text-xs font-bold text-[#6d28d9]">Strength, size, and affordability</p>
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
                <div key={label} className="flex gap-4 border-b border-gray-100 pb-3 last:border-b-0">
                  <span className="min-w-[118px] font-bold text-[#6F7192]">{label}</span>
                  <span className="font-semibold text-[#070b1d]">{value}</span>
                </div>
              ))}
              <div className="rounded-2xl bg-[#FAFBFD] p-4">
                <p className="mb-1 text-xs font-bold uppercase text-[#6F7192]">Ideal For</p>
                <p className="text-sm font-semibold leading-6 text-[#070b1d]">Industrial parts, functional prototypes, architecture models, student projects, large prints, outdoor parts</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="materials-tech-card rounded-lg border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)]"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#3730a3]">
                <Diamond className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#070b1d]">Resin Printing</h3>
                <p className="text-xs font-bold text-[#3730a3]">Detail, surface finish, and precision</p>
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
                <div key={label} className="flex gap-4 border-b border-gray-100 pb-3 last:border-b-0">
                  <span className="min-w-[118px] font-bold text-[#6F7192]">{label}</span>
                  <span className="font-semibold text-[#070b1d]">{value}</span>
                </div>
              ))}
              <div className="rounded-2xl bg-[#FAFBFD] p-4">
                <p className="mb-1 text-xs font-bold uppercase text-[#6F7192]">Ideal For</p>
                <p className="text-sm font-semibold leading-6 text-[#070b1d]">Dental models, jewelry, miniatures, medical models, fine detail props, product presentation models</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="materials-info-panel mt-5 flex items-start gap-3 rounded-lg border border-[#6d28d9]/15 bg-white p-4 text-sm shadow-sm"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6d28d9]" />
          <span className="font-semibold leading-6 text-[#070b1d]">
            When in doubt: if it needs to be strong, start with FDM. If it needs to look flawless, start with Resin. If it needs both, consider ABS-like resin or ask us.
          </span>
        </motion.div>
      </div>
    </section>
  )
}
