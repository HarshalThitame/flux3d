'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react'

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-xs ${i < count ? 'text-[#6d28d9]' : 'text-gray-200'}`}>★</span>
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

function Availability({ stock }: { stock?: string | boolean }) {
  if (stock === true || stock === 'Healthy') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        In stock
      </span>
    )
  }

  if (stock === 'Low' || stock === false) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
        Low stock
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
      <PhoneCall className="h-3.5 w-3.5" />
      {typeof stock === 'string' ? stock : 'Request'}
    </span>
  )
}

export default function ComparisonTable({ materials = [] }: ComparisonTableProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  if (materials.length === 0) {
    return (
      <section ref={ref} className="px-4 py-12 md:px-8 lg:px-16">
        <div className="mx-auto max-w-[1200px] rounded-3xl border border-gray-200 bg-white py-12 text-center shadow-sm">
          <p className="text-[#6F7192]">No materials available for comparison.</p>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="px-4 py-14 md:px-8 lg:px-16">
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="inline-block text-xs font-bold uppercase text-[#6d28d9]">
              At a glance
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-[#111827] md:text-4xl">
              Compare materials without guessing.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#6F7192]">
            Price, finish, strength, heat, and availability in one clean view before you open the detailed cards.
          </p>
        </motion.div>

        <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-[#F7F8FB] text-xs uppercase text-[#6F7192]">
                <th className="px-5 py-4 text-left font-bold">Material</th>
                <th className="px-4 py-4 text-left font-bold">Type</th>
                <th className="px-4 py-4 text-left font-bold">Price/g</th>
                <th className="px-4 py-4 text-left font-bold">Strength</th>
                <th className="px-4 py-4 text-left font-bold">Flexibility</th>
                <th className="px-4 py-4 text-left font-bold">Heat</th>
                <th className="px-4 py-4 text-left font-bold">Finish</th>
                <th className="px-4 py-4 text-left font-bold">Difficulty</th>
                <th className="hidden px-4 py-4 text-left font-bold lg:table-cell">Best For</th>
                <th className="px-5 py-4 text-left font-bold">Availability</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <motion.tr
                  key={m.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.03 }}
                  className="border-t border-gray-100 transition-colors hover:bg-[#FAFBFD]"
                >
                  <td className="px-5 py-4 font-extrabold text-[#111827]">{m.name}</td>
                  <td className="px-4 py-4 text-[#6F7192]">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.type === 'FDM' ? 'bg-[#ede9fe] text-[#5b21b6]' : 'bg-[#eef2ff] text-[#3730a3]'}`}>
                      {m.type || 'FDM'}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-[#6d28d9]">₹{m.price || 0}</td>
                  <td className="px-4 py-4 text-[#4B5563]">{m.strengthRating || <Stars count={3} />}</td>
                  <td className="px-4 py-4 text-[#4B5563]">{m.properties?.flexibility || <Stars count={2} />}</td>
                  <td className="px-4 py-4 text-[#4B5563]">{m.heatResistance || m.properties?.tempResistance || <Stars count={2} />}</td>
                  <td className="px-4 py-4 text-[#4B5563]">{m.finishQuality || <Stars count={3} />}</td>
                  <td className="px-4 py-4 text-xs font-semibold text-[#6F7192]">{m.difficultyLevel || 'Easy'}</td>
                  <td className="hidden max-w-[240px] px-4 py-4 text-[#6F7192] lg:table-cell">
                    {Array.isArray(m.bestFor) ? m.bestFor.join(', ') : (m.bestFor || 'General')}
                  </td>
                  <td className="px-5 py-4">
                    <Availability stock={m.stock} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </section>
  )
}
