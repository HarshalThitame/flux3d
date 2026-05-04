'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-xs ${i < count ? 'text-[#FF5C1A]' : 'text-[#2a2f45]'}`}>★</span>
      ))}
    </span>
  )
}

type MaterialForComparison = {
  name: string
  type: string
  price: number
  strengthRating?: string
  properties?: {
    flexibility?: string
    tempResistance?: string
  }
  difficultyLevel?: string
  heatResistance?: string
  finishQuality?: string
  bestFor?: string[]
  stock?: string | boolean
}

type ComparisonTableProps = {
  materials?: MaterialForComparison[]
}

export default function ComparisonTable({ materials = [] }: ComparisonTableProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  if (materials.length === 0) {
    return (
      <section ref={ref} className="px-4 md:px-8 lg:px-16 py-16">
        <div className="max-w-[1200px] mx-auto text-center py-12">
          <p className="text-[#7a82a0]">No materials available for comparison.</p>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="px-4 md:px-8 lg:px-16 py-16">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-8"
        >
          <span className="inline-block text-[#FF5C1A] text-xs font-semibold tracking-wider uppercase mb-2">
            At a Glance
          </span>
          <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-white mb-2">
            All Materials — Quick Comparison
          </h2>
          <p className="text-[#7a82a0] text-sm">
            Use this table to quickly compare properties from the database before diving into full material guides below.
          </p>
        </motion.div>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] text-[#7a82a0] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Material</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Price/g</th>
                <th className="text-left px-4 py-3 font-medium">Strength Rating</th>
                <th className="text-left px-4 py-3 font-medium">Flexibility</th>
                <th className="text-left px-4 py-3 font-medium">Heat Resistance</th>
                <th className="text-left px-4 py-3 font-medium">Finish Quality</th>
                <th className="text-left px-4 py-3 font-medium">Difficulty</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Best For</th>
                <th className="text-left px-4 py-3 font-medium">Availability</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <motion.tr
                  key={m.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.03 }}
                  className="border-t border-white/[0.04] hover:bg-[rgba(255,92,26,0.03)] transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-white">{m.name}</td>
                  <td className="px-4 py-3 text-[#7a82a0]">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${m.type === 'FDM' ? 'bg-[#FF5C1A]/10 text-[#FF5C1A]' : 'bg-[#5064FF]/10 text-[#5064FF]'}`}>
                      {m.type || 'FDM'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#FF5C1A] font-medium">₹{m.price || 0}</td>
                  <td className="px-4 py-3 text-[#7a82a0]">{m.strengthRating || <Stars count={3} />}</td>
                  <td className="px-4 py-3 text-[#7a82a0]">{m.properties?.flexibility || <Stars count={2} />}</td>
                  <td className="px-4 py-3 text-[#7a82a0]">{m.heatResistance || m.properties?.tempResistance || <Stars count={2} />}</td>
                  <td className="px-4 py-3 text-[#7a82a0]">{m.finishQuality || <Stars count={3} />}</td>
                  <td className="px-4 py-3 text-[#7a82a0] text-xs">{m.difficultyLevel || 'Easy'}</td>
                  <td className="px-4 py-3 text-[#7a82a0] hidden lg:table-cell">
                    {Array.isArray(m.bestFor) ? m.bestFor.join(', ') : (m.bestFor || 'General')}
                  </td>
                  <td className="px-4 py-3">
                    {m.stock === true || m.stock === 'Healthy' ? (
                      <span className="text-emerald-400 text-xs">✅ In Stock</span>
                    ) : m.stock === 'Low' || m.stock === false ? (
                      <span className="text-yellow-400 text-xs">⚠ Low Stock</span>
                    ) : (
                      <span className="text-[#7a82a0] text-xs">📞 {typeof m.stock === 'string' ? m.stock : 'Request'}</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
