'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PricingCTA from '@/app/services/PricingCTA'
import PricingCards from '@/components/PricingCards'

export default function PricingClient({
  materials,
}: {
  materials: { name: string; price_per_gram: number; density: number }[]
}) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
        <main className="pt-32">
          <section className="px-6 md:px-12">
            <div className="mx-auto max-w-[1200px]">
              <div className="h-6 w-24 bg-[#FFFFFF] rounded animate-pulse mb-4" />
              <div className="h-12 w-96 bg-[#FFFFFF] rounded animate-pulse mb-6" />
              <div className="h-4 w-full max-w-[700px] bg-[#FFFFFF] rounded animate-pulse mb-12" />
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-48 bg-[#FFFFFF] rounded-[28px] animate-pulse" />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <main className="pt-32">
        <section className="px-6 md:px-12">
          <div className="mx-auto max-w-[1200px]">
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#5B3FD6]"
            >
              Pricing
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-[#0F1B3D]"
            >
              Clear Pricing for <span className="text-[#6F7192]">Serious 3D Printing Work</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-[700px] text-base leading-8 text-[#6F7192]"
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
