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
    <section className="relative w-full py-24 px-4 md:px-8 lg:px-16 z-10" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-4">
          <span className="inline-block text-[#7C5CFF] text-sm font-semibold tracking-wider uppercase">
            Why Flux 3D
          </span>
        </Reveal>

        <Reveal delay={80} className="mb-6">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F1B3D] leading-tight">
            Stop Waiting Weeks.
            <br />
            Stop Overpaying Factories.
          </h2>
        </Reveal>

        <Reveal delay={140}>
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mb-16 leading-relaxed">
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
                  className="group relative bg-[rgba(255,255,255,0.82)] border border-white/[0.07] rounded-2xl p-6 border-gray-800 hover:border-[#7C5CFF]/50 transition-all duration-300 hover-lift"
                  style={{
                    backgroundColor: '#FFFFFF',
                    willChange: 'transform',
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-[#7C5CFF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-[#7C5CFF]/10 flex items-center justify-center mb-4 group-hover:bg-[#7C5CFF]/20 transition-colors duration-300">
                      <Icon className="w-6 h-6 text-[#7C5CFF]" />
                    </div>

                    <div className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D] mb-2 group-hover:text-[#7C5CFF] transition-colors duration-300">
                      {point.problem}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <ArrowRight className="w-4 h-4 text-[#7C5CFF]" />
                      <span className="text-[#7C5CFF] font-medium text-sm">
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
