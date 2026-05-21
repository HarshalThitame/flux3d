'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Layers3,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Wand2,
} from 'lucide-react'

type MaterialPricing = {
  name: string
  price_per_gram: number
  density: number
}

const quoteDrivers = [
  {
    title: 'Material',
    description: 'PLA, ABS, PETG, resin, and specialty filaments are priced by consumption and availability.',
    icon: Layers3,
  },
  {
    title: 'Geometry',
    description: 'Wall thickness, supports, infill, and part orientation shape machine time and material use.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Finish',
    description: 'Sanding, priming, painting, smoothing, and assembly are quoted as controlled add-ons.',
    icon: Wand2,
  },
  {
    title: 'Timeline',
    description: 'Standard, priority, and batch runs are planned around quality checks and delivery dates.',
    icon: Clock3,
  },
]

const workflow = [
  'Upload your STL, STEP, OBJ, or reference files.',
  'Choose material, finish, quantity, and delivery priority.',
  'Receive a clear quote with print, finish, and shipping details.',
  'Approve the order and track production through dispatch.',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value)
}

export default function PricingClient({
  materials,
}: {
  materials: MaterialPricing[]
}) {
  const displayMaterials = materials.filter((material) => material.name).slice(0, 8)
  const startingMaterial = displayMaterials.find((material) => Number(material.price_per_gram) > 0) || displayMaterials[0]
  const startingPrice = startingMaterial?.price_per_gram || 3

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-[#111827]">
      <main className="px-4 pb-20 pt-20 sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8 lg:p-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-[#FAFAFC] px-3 py-1.5 text-xs font-semibold uppercase text-[#5B3FD6]">
                <IndianRupee className="h-3.5 w-3.5" />
                Transparent pricing
              </div>
              <h1 className="mt-5 max-w-3xl font-[var(--font-syne)] text-4xl font-bold leading-tight text-[#111827] sm:text-5xl lg:text-6xl">
                Premium 3D printing quotes without guesswork.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5F6673] md:text-lg">
                See starting material rates, understand what changes the final price, and upload a file when you want a production-ready quote.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/instant-quote"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A3343]"
                >
                  Upload for quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/materials"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:border-[#5B3FD6] hover:text-[#5B3FD6]"
                >
                  Compare materials
                </Link>
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="rounded-lg border border-gray-200 bg-[#111827] p-6 text-white shadow-[0_24px_70px_rgba(17,24,39,0.18)] md:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#C8BEFF]">Starting from</p>
                  <p className="mt-3 font-[var(--font-syne)] text-5xl font-bold">₹{formatCurrency(startingPrice)}/g</p>
                  <p className="mt-2 text-sm text-gray-300">
                    {startingMaterial?.name || 'PLA'} material rate before geometry, support, finish, and quantity review.
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <ShieldCheck className="h-6 w-6 text-[#C8BEFF]" />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {[
                  'No hidden finishing charges',
                  'Material and print-time review',
                  'Pan-India shipping support',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#9BE7C2]" />
                    {item}
                  </div>
                ))}
              </div>

              <Link
                href="/instant-quote"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F1EEFF]"
              >
                Start quote request
                <UploadCloud className="h-4 w-4" />
              </Link>
            </motion.aside>
          </section>

          <section className="pt-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-[#5B3FD6]">Quote drivers</p>
                <h2 className="mt-1 font-[var(--font-syne)] text-2xl font-bold text-[#111827] md:text-3xl">
                  What shapes the final quote
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#6B7280]">
                The listed material rate is only the starting point. The production review locks the final amount.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quoteDrivers.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.06 * index }}
                    className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1EEFF] text-[#5B3FD6]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-[var(--font-syne)] text-xl font-bold text-[#111827]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#5F6673]">{item.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </section>

          <section className="pt-12">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase text-[#5B3FD6]">Material rates</p>
                <h2 className="mt-1 font-[var(--font-syne)] text-2xl font-bold text-[#111827] md:text-3xl">
                  Clear per-gram starting points
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#5F6673]">
                  Use these rates to compare material direction before upload. The final quote includes print setup, supports, finish, quantity, and delivery needs.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] border-b border-gray-200 bg-[#FAFAFC] px-4 py-3 text-xs font-semibold uppercase text-[#6B7280]">
                  <span>Material</span>
                  <span>Rate</span>
                  <span>Density</span>
                </div>
                {displayMaterials.map((material) => (
                  <div
                    key={material.name}
                    className="grid grid-cols-[1.2fr_0.8fr_0.8fr] items-center gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">{material.name}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">Production material</p>
                    </div>
                    <p className="text-sm font-bold text-[#5B3FD6]">₹{formatCurrency(Number(material.price_per_gram || 0))}/g</p>
                    <p className="text-sm text-[#5F6673]">{Number(material.density || 0).toFixed(2)} g/cm³</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="pt-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase text-[#5B3FD6]">Quote workflow</p>
                  <h2 className="mt-1 font-[var(--font-syne)] text-2xl font-bold text-[#111827] md:text-3xl">
                    From upload to dispatch
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-[#5F6673]">
                    A clear review path keeps pricing accurate before production starts.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {workflow.map((step, index) => (
                    <div key={step} className="rounded-lg border border-gray-200 bg-[#FAFAFC] p-4">
                      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-[#374151]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="pt-12">
            <div className="grid gap-5 rounded-lg bg-[#111827] p-6 text-white shadow-[0_24px_70px_rgba(17,24,39,0.18)] md:grid-cols-[1fr_auto] md:items-center md:p-8">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                  <PackageCheck className="h-5 w-5 text-[#C8BEFF]" />
                </div>
                <h2 className="font-[var(--font-syne)] text-2xl font-bold md:text-3xl">Ready for a real quote?</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
                  Upload your file and Flux3D will price the part around actual geometry, material, finish, and production timeline.
                </p>
              </div>
              <Link
                href="/instant-quote"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F1EEFF]"
              >
                Upload model
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
