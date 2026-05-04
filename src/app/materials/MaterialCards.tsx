'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, X, ChevronDown } from 'lucide-react'

type MaterialCardData = {
  id: string
  name: string
  icon: string
  description: string
  color?: string
  gradient?: string
  properties?: {
    strength: string
    flexibility: string
    tempResistance: string
    difficulty: string
  }
  useCases?: string[]
  pros?: string[]
  cons?: string[]
  keyProperties?: string[]
  bestFor?: string[]
  difficultyLevel?: string
  heatResistance?: string
  strengthRating?: string
  finishQuality?: string
  samplePhoto?: string
  pricePerGram?: number
  density?: number
}

type MaterialCardsProps = {
  materials: MaterialCardData[]
}

function MaterialCard({ data, index }: { data: MaterialCardData; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      id={`material-${data.name.toLowerCase().replace(/\s+/g, '-')}`}
      className={`rounded-[28px] border transition-all duration-500 ${expanded ? 'border-[#FF5C1A]/30 bg-[#0d1120]' : 'border-white/10 bg-[#0a0f1e] hover:border-[#FF5C1A]/30'}`}
    >
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{data.icon}</span>
            <div>
              <h3 className="font-[var(--font-syne)] text-xl font-bold text-white">
                {data.name}
              </h3>
              {data.difficultyLevel && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${data.difficultyLevel === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : data.difficultyLevel === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                  {data.difficultyLevel}
                </span>
              )}
            </div>
          </div>
          {data.pricePerGram && (
            <div className="text-right">
              <div className="text-2xl font-bold text-[#FF5C1A]">₹{data.pricePerGram}</div>
              <div className="text-xs text-[#7a82a0]">per gram</div>
            </div>
          )}
        </div>

        <p className="text-sm text-[#b1b9d5] leading-7 mb-4">
          {data.description}
        </p>

        {data.keyProperties && data.keyProperties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {data.keyProperties.map((prop, idx) => (
              <span key={idx} className="rounded-full bg-[#FF5C1A]/10 px-3 py-1 text-xs text-[#FF5C1A]">
                {prop}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          {data.strengthRating && (
            <div className="rounded-lg bg-white/[0.03] p-3">
              <div className="text-[#7a82a0] mb-1">Strength</div>
              <div className="text-white font-medium">{data.strengthRating}</div>
            </div>
          )}
          {data.heatResistance && (
            <div className="rounded-lg bg-white/[0.03] p-3">
              <div className="text-[#7a82a0] mb-1">Heat Resistance</div>
              <div className="text-white font-medium">{data.heatResistance}</div>
            </div>
          )}
          {data.finishQuality && (
            <div className="rounded-lg bg-white/[0.03] p-3">
              <div className="text-[#7a82a0] mb-1">Finish Quality</div>
              <div className="text-white font-medium">{data.finishQuality}</div>
            </div>
          )}
          {data.density && (
            <div className="rounded-lg bg-white/[0.03] p-3">
              <div className="text-[#7a82a0] mb-1">Density</div>
              <div className="text-white font-medium">{data.density} g/cm³</div>
            </div>
          )}
        </div>

        {data.bestFor && data.bestFor.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[#7a82a0] mb-2">Best For:</div>
            <div className="flex flex-wrap gap-1">
              {data.bestFor.map((item, idx) => (
                <span key={idx} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-[#b1b9d5]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-[#FF5C1A] hover:text-[#FF9A72] transition-colors"
        >
          {expanded ? 'Show Less' : 'Show More'}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {data.useCases && data.useCases.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Use Cases</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {data.useCases.map((useCase, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#b1b9d5]">
                        <Check className="h-3 w-3 text-[#FF5C1A] flex-shrink-0" />
                        {useCase}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.pros && data.pros.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2">Pros</h4>
                  <div className="space-y-1">
                    {data.pros.map((pro, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#b1b9d5]">
                        <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        {pro}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.cons && data.cons.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-rose-400 mb-2">Cons</h4>
                  <div className="space-y-1">
                    {data.cons.map((con, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#b1b9d5]">
                        <X className="h-3 w-3 text-rose-400 flex-shrink-0" />
                        {con}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.samplePhoto && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Sample Photo</h4>
                  <img
                    src={data.samplePhoto}
                    alt={`${data.name} sample`}
                    className="rounded-xl w-full object-cover"
                  />
                </div>
              )}

              <Link
                href={`/instant-quote?material=${data.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Get Quote for {data.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default function MaterialCards({ materials }: MaterialCardsProps) {
  if (!materials || materials.length === 0) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-16">
        <div className="max-w-[1200px] mx-auto text-center py-12">
          <p className="text-[#7a82a0]">No materials available. Add materials in the admin panel.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 md:px-8 lg:px-16 py-16">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <span className="inline-block text-[#FF5C1A] text-xs font-semibold tracking-wider uppercase mb-2">
            Material Details
          </span>
          <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-white">
            Explore Our Materials
          </h2>
        </motion.div>

        <div className="space-y-6">
          {materials.map((material, index) => (
            <MaterialCard key={material.id || material.name} data={material} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
