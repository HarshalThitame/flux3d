'use client'

import { motion } from 'framer-motion'
import PricingCTA from '@/app/services/PricingCTA'
import PricingCards from '@/components/PricingCards'

export default function PricingClient({
  materials,
}: {
  materials: { name: string; price_per_gram: number; density: number }[]
}) {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <main className="pt-32">
        <section className="px-6 md:px-12">
          <div className="mx-auto max-w-[1200px]">
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]"
            >
              Pricing
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-white"
            >
              Clear Pricing for <span className="text-[#7a82a0]">Serious 3D Printing Work</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-[700px] text-base leading-8 text-[#7a82a0]"
            >
              Your final quote is shaped by material, geometry, print time, finishing, and quantity. The goal here is simple: make the starting point obvious and the next step effortless.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              <PricingCards materials={materials} />
            </motion.div>
          </div>
        </section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <PricingCTA />
        </motion.div>
      </main>
    </div>
  )
}
