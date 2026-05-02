'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Check, X, ChevronDown } from 'lucide-react'

type MaterialSpec = {
  id: string
  name: string
  tag: string
  icon: string
  description: string
  color?: string
  gradient?: string
  properties: {
    strength: string
    flexibility: string
    tempResistance: string
    difficulty: string
  }
  useCases: string[]
  pros: string[]
  cons: string[]
  settings?: {
    nozzle: string
    bed: string
    speed: string
  }
}

type MaterialCardsProps = {
  materials: MaterialSpec[]
}

function MaterialCard({ data, index }: { data: MaterialSpec; index: number }) {
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
              {data.tag && (
                <span key={data.tag} className="rounded-full bg-[#FF5C1A]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#FF8A57]">
                  {data.tag}
                </span>
              )}
            </div>
            <h3 className="font-[var(--font-syne)] text-xl md:text-2xl font-bold text-white">
              {data.name}
            </h3>
            <p className="mt-1 text-[#7a82a0] text-sm">{data.icon}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#FF8A57]">
              {data.pros?.find(p => p.includes('₹'))?.match(/₹([\d.]+)/)?.[1] ?? 'N/A'}
              <span className="text-sm">/g</span>
            </div>
            <p className="mt-1 text-xs text-[#7a82a0]">excl. GST</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-[#b1b9d5]">{data.description}</p>

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
          {data.color && (
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Color</h4>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: data.color }} />
                <span className="text-sm text-[#c6cee5]">{data.color}</span>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Properties</h4>
              <div className="space-y-2">
                {Object.entries(data.properties).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-[#8b95b5] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {data.settings && (
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Print Settings</h4>
                <div className="space-y-2">
                  {Object.entries(data.settings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-[#8b95b5] capitalize">{key}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Best For</h4>
              <div className="space-y-1">
                {data.useCases.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-[#c6cee5]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#7a82a0]">Limitations</h4>
              <div className="space-y-1">
                {data.cons.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-[#c6cee5]">
                    <X className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.pros && (
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-4">
              <h4 className="mb-2 text-sm font-semibold text-emerald-400">Pros</h4>
              <div className="space-y-1">
                {data.pros.map((pro) => (
                  <div key={pro} className="flex items-start gap-2 text-sm text-[#c6cee5]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    {pro}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/instant-quote"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-[0_0_25px_rgba(255,92,26,0.3)]"
          >
            Get Quote for {data.name}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function MaterialCards({ materials }: MaterialCardsProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const searchParams = useSearchParams()

  // Handle scroll to selected material
  const materialName = searchParams.get('name')
  useState(() => {
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
  })

  if (materials.length === 0) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-16">
        <div className="max-w-[1200px] mx-auto text-center py-12">
          <p className="text-[#7a82a0]">No materials available at the moment.</p>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="px-4 md:px-8 lg:px-16 py-16">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-8"
        >
          <span className="inline-block text-[#FF5C1A] text-xs font-semibold tracking-wider uppercase mb-2">
            Available Materials
          </span>
          <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-white mb-2">
            Material Catalog
          </h2>
          <p className="text-[#7a82a0] text-sm">
            Click each section to expand properties, use cases, and recommendations.
          </p>
        </motion.div>

        {materials.map((m, i) => (
          <MaterialCard key={m.id} data={m} index={i} />
        ))}
      </div>
    </section>
  )
}
