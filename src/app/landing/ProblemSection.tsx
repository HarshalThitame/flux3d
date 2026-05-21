'use client'

import { Hourglass, Banknote, Wrench, ArrowRight } from 'lucide-react'
import Reveal from '@/components/Reveal'

const painPoints = [
  {
    id: 1,
    emoji: '⏳',
    icon: Hourglass,
    problem: 'Traditional Manufacturing Takes Weeks',
    solution: '24–48 hour turnaround',
  },
  {
    id: 2,
    emoji: '💸',
    icon: Banknote,
    problem: 'Factories Demand Huge Minimum Orders',
    solution: 'Order just 1 piece',
  },
  {
    id: 3,
    emoji: '🔧',
    icon: Wrench,
    problem: 'Design Changes Are Costly and Slow',
    solution: 'Iterate overnight',
  },
]

export default function ProblemSection() {
  return (
    <section className="relative z-10 w-full bg-[var(--bg-base)] px-4 py-24 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-4">
          <span className="inline-block text-sm font-semibold uppercase tracking-normal text-[#6d28d9]">
            Why Flux 3D
          </span>
        </Reveal>

        <Reveal delay={80} className="mb-6">
          <h2 className="text-3xl font-semibold leading-tight tracking-normal text-[#1a1a1a] md:text-4xl lg:text-5xl">
            Stop Waiting Weeks.
            <br />
            Stop Overpaying Factories.
          </h2>
        </Reveal>

        <Reveal delay={140}>
          <p className="mb-16 max-w-3xl text-lg font-normal leading-relaxed text-[#4b4b4b] md:text-xl">
            Traditional manufacturing is slow, expensive, and inflexible. Minimum
            order quantities, long lead times, and high tooling costs kill great
            ideas before they even start. Flux 3D changes that. We print exactly
            what you need — one piece or a hundred — delivered fast, priced fairly,
            with no compromise on quality.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {painPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <Reveal key={point.id} delay={200 + index * 90}>
                <div
                  className="hover-lift group relative rounded-2xl border border-[#e8e4df] bg-[#faf9f7] p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]"
                  style={{
                    willChange: 'transform',
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-[#6d28d9]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6d28d9]/10 transition-colors duration-300 group-hover:bg-[#6d28d9]/20">
                      <Icon className="h-6 w-6 text-[#6d28d9]" />
                    </div>

                    <div className="mb-2 text-lg font-semibold text-[#1a1a1a] transition-colors duration-300 group-hover:text-[#6d28d9]">
                      {point.problem}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <ArrowRight className="h-4 w-4 text-[#6d28d9]" />
                      <span className="text-sm font-medium text-[#6d28d9]">
                        Flux 3D: {point.solution}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
