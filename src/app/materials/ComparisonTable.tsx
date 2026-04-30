'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const materials = [
  { name: 'PLA+', type: 'FDM', price: 8, strength: 3, flex: 1, heat: 2, detail: 3, bestFor: 'Students, Gifts, Prototypes', stock: true },
  { name: 'PETG', type: 'FDM', price: 9, strength: 4, flex: 2, heat: 3, detail: 3, bestFor: 'Functional Parts, Containers', stock: true },
  { name: 'ABS', type: 'FDM', price: 10, strength: 4, flex: 2, heat: 4, detail: 3, bestFor: 'Machine Parts, Enclosures', stock: true },
  { name: 'ASA', type: 'FDM', price: 11, strength: 4, flex: 2, heat: 5, detail: 3, bestFor: 'Outdoor Parts, Automotive', stock: true },
  { name: 'TPU', type: 'FDM', price: 12, strength: 3, flex: 5, heat: 2, detail: 3, bestFor: 'Grips, Gaskets, Wearables', stock: true },
  { name: 'Nylon PA12', type: 'FDM', price: 18, strength: 5, flex: 3, heat: 4, detail: 4, bestFor: 'Industrial Jigs, Structural', stock: true },
  { name: 'Silk PLA', type: 'FDM', price: 10, strength: 3, flex: 1, heat: 2, detail: 5, bestFor: 'Gifts, Trophies, Decor', stock: true },
  { name: 'Multi-Color PLA', type: 'FDM', price: 14, strength: 3, flex: 1, heat: 2, detail: 4, bestFor: 'Logos, Figurines, Signage', stock: true },
  { name: 'Standard Resin 4K', type: 'Resin', price: 18, strength: 3, flex: 1, heat: 2, detail: 5, bestFor: 'Dental, Miniatures, Jewelry', stock: true },
  { name: 'ABS-Like Resin', type: 'Resin', price: 20, strength: 4, flex: 2, heat: 3, detail: 5, bestFor: 'Engineering Prototypes', stock: true },
  { name: 'Dental Resin', type: 'Resin', price: 28, strength: 4, flex: 2, heat: 3, detail: 5, bestFor: 'Dental Models, Aligners', stock: false },
  { name: 'Biocompatible Resin', type: 'Resin', price: 35, strength: 4, flex: 2, heat: 3, detail: 5, bestFor: 'Medical, Skin-contact', stock: false },
]

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-xs ${i < count ? 'text-[#FF5C1A]' : 'text-[#2a2f45]'}`}>★</span>
      ))}
    </span>
  )
}

export default function ComparisonTable() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

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
            Use this table to quickly compare properties before diving into full material guides below.
          </p>
        </motion.div>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] text-[#7a82a0] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Material</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Price/g</th>
                <th className="text-left px-4 py-3 font-medium">Strength</th>
                <th className="text-left px-4 py-3 font-medium">Flex</th>
                <th className="text-left px-4 py-3 font-medium">Heat</th>
                <th className="text-left px-4 py-3 font-medium">Detail</th>
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
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#FF5C1A] font-medium">₹{m.price}</td>
                  <td className="px-4 py-3"><Stars count={m.strength} /></td>
                  <td className="px-4 py-3"><Stars count={m.flex} /></td>
                  <td className="px-4 py-3"><Stars count={m.heat} /></td>
                  <td className="px-4 py-3"><Stars count={m.detail} /></td>
                  <td className="px-4 py-3 text-[#7a82a0] hidden lg:table-cell">{m.bestFor}</td>
                  <td className="px-4 py-3">
                    {m.stock
                      ? <span className="text-emerald-400 text-xs">✅ Always</span>
                      : <span className="text-[#7a82a0] text-xs">📞 Request</span>
                    }
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
