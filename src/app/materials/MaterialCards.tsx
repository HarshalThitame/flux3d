'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, type ComponentType } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check, X, ChevronDown, Gauge, ShieldCheck, Sparkles, Thermometer } from 'lucide-react'

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

function getDifficultyClass(value?: string) {
  const normalized = value?.toLowerCase() ?? ''
  if (normalized.includes('easy')) return 'bg-emerald-50 text-emerald-700'
  if (normalized.includes('medium')) return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

function getMaterialInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function SpecTile({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-100 bg-[#FAFBFD] px-3 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#6F7192]">
        <Icon className="h-3.5 w-3.5 text-[#6d28d9]" />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-extrabold text-[#111827]" title={value}>{value}</div>
    </div>
  )
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
      className={`overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_16px_50px_rgba(17,24,39,0.07)] transition-all duration-300 ${expanded ? 'border-[#6d28d9]/30' : 'border-gray-200 hover:-translate-y-1 hover:border-[#6d28d9]/25 hover:shadow-[0_24px_70px_rgba(17,24,39,0.12)]'}`}
    >
      <div className="p-5 md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(17,24,39,0.18)]">
              {getMaterialInitials(data.name)}
            </span>
            <div>
              <h3 className="text-xl font-extrabold leading-tight text-[#111827]">
                {data.name}
              </h3>
              {data.difficultyLevel && (
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getDifficultyClass(data.difficultyLevel)}`}>
                  {data.difficultyLevel}
                </span>
              )}
            </div>
          </div>
          {data.pricePerGram && (
            <div className="shrink-0 rounded-2xl border border-[#6d28d9]/10 bg-[#f5f3ff] px-3 py-2 text-right">
              <div className="text-xl font-extrabold text-[#6d28d9]">₹{data.pricePerGram}</div>
              <div className="text-[11px] font-bold uppercase text-[#6F7192]">per gram</div>
            </div>
          )}
        </div>

        <p className="mb-5 min-h-[72px] text-sm leading-6 text-[#4B5563]">
          {data.description}
        </p>

        {data.keyProperties && data.keyProperties.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {data.keyProperties.map((prop, idx) => (
              <span key={idx} className="rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-bold text-[#5b21b6]">
                {prop}
              </span>
            ))}
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3">
          {data.strengthRating && (
            <SpecTile label="Strength" value={data.strengthRating} icon={ShieldCheck} />
          )}
          {data.heatResistance && (
            <SpecTile label="Heat" value={data.heatResistance} icon={Thermometer} />
          )}
          {data.finishQuality && (
            <SpecTile label="Finish" value={data.finishQuality} icon={Sparkles} />
          )}
          {data.density && (
            <SpecTile label="Density" value={`${data.density} g/cm3`} icon={Gauge} />
          )}
        </div>

        {data.bestFor && data.bestFor.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 text-xs font-bold uppercase text-[#6F7192]">Best for</div>
            <div className="flex flex-wrap gap-2">
              {data.bestFor.map((item, idx) => (
                <span key={idx} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-[#4B5563]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-bold text-[#6d28d9] transition-colors hover:text-[#4c1d95]"
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
            <div className="space-y-5 pt-5">
              {data.useCases && data.useCases.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-extrabold text-[#111827]">Use Cases</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {data.useCases.map((useCase, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
                        <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#6d28d9]" />
                        {useCase}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.pros && data.pros.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-extrabold text-emerald-700">Pros</h4>
                  <div className="space-y-1">
                    {data.pros.map((pro, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
                        <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                        {pro}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.cons && data.cons.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-extrabold text-rose-700">Cons</h4>
                  <div className="space-y-1">
                    {data.cons.map((con, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
                        <X className="h-3.5 w-3.5 flex-shrink-0 text-rose-600" />
                        {con}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.samplePhoto && (
                <div>
                  <h4 className="mb-2 text-sm font-extrabold text-[#111827]">Sample Photo</h4>
                  <Image
                    src={data.samplePhoto}
                    alt={`${data.name} 3D printed sample by Flux3D`}
                    width={640}
                    height={420}
                    className="h-auto w-full rounded-2xl object-cover"
                  />
                </div>
              )}

              <Link
                href={`/instant-quote?material=${data.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111827] px-5 text-sm font-bold text-white transition hover:bg-[#2f3341]"
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
      <section className="px-4 py-12 md:px-8 lg:px-16">
        <div className="mx-auto max-w-[1200px] rounded-3xl border border-gray-200 bg-white py-12 text-center shadow-sm">
          <p className="text-[#6F7192]">No materials available. Add materials in the admin panel.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 py-14 md:px-8 lg:px-16">
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="inline-block text-xs font-bold uppercase text-[#6d28d9]">
              Material details
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-[#111827] md:text-4xl">
              Premium material cards for real decisions.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#6F7192]">
            Every material is framed around what a buyer actually needs: price, finish, durability, and recommended applications.
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-2">
          {materials.map((material, index) => (
            <MaterialCard key={material.id || material.name} data={material} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
