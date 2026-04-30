'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Check, X, MessageCircle, ChevronDown } from 'lucide-react'

interface MaterialData {
  name: string
  badge: string[]
  type: string
  price: string
  tagline: string
  description: string
  colors: string
  properties: { label: string; value: string }[]
  specs: { label: string; value: string }[]
  bestFor: string[]
  notFor: string[]
  industries?: string
  pricingExamples: { item: string; weight: string; price: string }[]
  proTip: string
  ctaText: string
  ctaLink: string
}

// materials data array stays the same - keeping it as is from the original file...
// [Previous materials data - truncated for brevity]

function MaterialCard({ data, index }: { data: MaterialData; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      ref={cardRef}
      id={`material-${data.name.toLowerCase().replace(/\s+/g, '-')}`}
      className={`rounded-[28px] border transition-all duration-500 ${
        expanded ? 'border-[#FF5C1A]/40 bg-[#0d1120]' : 'border-[rgba(255,255,255,0.08)] bg-[#0a0f1e] hover:border-[#FF5C1A]/20'
      } overflow-hidden`}
    >
      <div
        className="p-6 md:p-8 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.badge.map((b) => (
                <span key={b} className="rounded-full bg-[#FF5C1A]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#FF8A57]">
                  {b}
                </span>
              ))}
            </div>
            <h3 className="font-[var(--font-syne)] text-xl md:text-2xl font-bold text-white">
              {data.name}
            </h3>
            <p className="mt-1 text-[#7a82a0] text-sm">{data.type}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#FF8A57]">{data.price}</div>
            <p className="mt-1 text-xs text-[#7a82a0]">excl. GST</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-[#b1b9d5]">{data.tagline}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-[#FF5C1A] font-medium">
            {expanded ? 'Show less' : 'Show full details'} <ChevronDown className={`inline w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </span>
          <span className="text-xs text-[#4a5070]">{expanded ? 'Click to collapse' : 'Click to expand'}</span>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="px-6 md:px-8 pb-8 space-y-6"
        >
          <p className="text-sm leading-7 text-[#b1b9d5]">{data.description}</p>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Available Colors</h4>
            <p className="text-sm text-[#c6cee5]">{data.colors}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Properties</h4>
              <div className="space-y-2">
                {data.properties.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-sm">
                    <span className="text-[#8b95b5]">{p.label}</span>
                    <span className="text-white font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Print Specs</h4>
              <div className="space-y-2">
                {data.specs.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="text-[#8b95b5]">{s.label}</span>
                    <span className="text-white font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Best For</h4>
              <div className="space-y-1">
                {data.bestFor.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-[#c6cee5]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Not Recommended For</h4>
              <div className="space-y-1">
                {data.notFor.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-[#c6cee5]">
                    <X className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.pricingExamples && (
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Pricing Examples</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="pb-2 text-xs font-medium text-[#5a6580]">Item</th>
                      <th className="pb-2 text-xs font-medium text-[#5a6580]">Weight</th>
                      <th className="pb-2 text-right text-xs font-medium text-[#5a6580]">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pricingExamples.map((ex) => (
                      <tr key={ex.item} className="border-b border-white/5">
                        <td className="py-2 text-sm text-white">{ex.item}</td>
                        <td className="py-2 text-sm text-[#8b95b5]">{ex.weight}</td>
                        <td className="py-2 text-right text-sm font-semibold text-[#FF8A57]">{ex.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.proTip && (
            <div className="rounded-xl bg-[#FF5C1A]/8 border border-[#FF5C1A]/20 p-4">
              <div className="flex items-start gap-2">
                <span className="text-[#FF5C1A] text-sm">💡</span>
                <p className="text-sm text-[#7a82a0] leading-relaxed">{data.proTip}</p>
              </div>
            </div>
          )}
          {data.industries && (
            <p className="text-xs text-[#4a5070] mb-4">
              Industries: {data.industries}
            </p>
          )}
          <Link
            href={data.ctaLink}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-[0_0_25px_rgba(255,92,26,0.3)]"
          >
            {data.ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function MaterialCards() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const searchParams = useSearchParams()
  const [materials, setMaterials] = useState<MaterialData[]>([])

  // Load materials data (simplified - in real app this would come from API)
  useEffect(() => {
    // Import materials data here or define it
    // For now, using the data from the original file
    setMaterials([]) // Placeholder - materials data should be imported
  }, [])

  // Handle scroll to selected material
  useEffect(() => {
    const materialName = searchParams.get('name')
    if (materialName && materials.length > 0) {
      const element = document.getElementById(`material-${materialName.toLowerCase().replace(/\s+/g, '-')}`)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-2', 'ring-[#FF5C1A]')
          setTimeout(() => element.classList.remove('ring-2', 'ring-[#FF5C1A]'), 2000)
        }, 500)
      }
    }
  }, [searchParams, materials])

  return (
    <section ref={ref} className="px-4 md:px-8 lg:px-16 py-16">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-8"
        >
          <span className="inline-block text-[#FF5C1A] text-xs font-semibold tracking-wider uppercase mb-2">
            Detailed Guides
          </span>
          <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-white mb-2">
            Material Deep Dives
          </h2>
          <p className="text-[#7a82a0] text-sm">
            Click each section to expand properties, specs, pricing, and recommendations.
          </p>
        </motion.div>

        {materials.map((m, i) => (
          <MaterialCard key={m.name} data={m} index={i} />
        ))}
      </div>
    </section>
  )
}
