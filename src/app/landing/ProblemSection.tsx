'use client'

import { memo, useRef } from 'react'
import { Hourglass, Banknote, Wrench, ArrowRight, CheckCircle2, ScanLine, Gauge } from 'lucide-react'
import Reveal from '@/components/Reveal'

const painPoints = [
  {
    id: 1,
    icon: Hourglass,
    metric: 'Weeks',
    problem: 'Traditional manufacturing stalls while you wait for suppliers.',
    solution: 'Quote in minutes. Express queue when the deadline is real.',
    accent: 'from-[#6d28d9] to-[#a855f7]',
  },
  {
    id: 2,
    icon: Banknote,
    metric: 'MOQ',
    problem: 'Factories push high minimums before the part is even proven.',
    solution: 'Print one fit-check part, then scale to a batch when it works.',
    accent: 'from-[#7c3aed] to-[#6d28d9]',
  },
  {
    id: 3,
    icon: Wrench,
    metric: 'Rework',
    problem: 'Every design change turns into another round of delay.',
    solution: 'Iterate overnight with material guidance and clean revision notes.',
    accent: 'from-[#a855f7] to-[#c084fc]',
  },
]

const productionLoop = [
  { icon: ScanLine, label: 'Geometry check', value: 'We inspect wall thickness, overhangs, and orientation.' },
  { icon: Gauge, label: 'Material match', value: 'PLA+, PETG, ABS, TPU, Nylon, and resin options.' },
  { icon: CheckCircle2, label: 'Dispatch proof', value: 'Photo update and tracked delivery before it leaves.' },
]

function ProblemSection() {
  const ref = useRef<HTMLElement>(null)

  return (
    <section ref={ref} className="premium-problem relative z-10 w-full overflow-hidden px-4 py-12 md:px-8 md:py-16 lg:px-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-start gap-8 md:gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="lg:sticky lg:top-28">
          <div>
            <span className="premium-eyebrow">Why Flux3D</span>

            <h2 className="mt-4 text-[clamp(2rem,6vw,4rem)] font-black leading-[0.98] tracking-normal text-[var(--pm-ink)] md:mt-5 md:text-5xl lg:text-6xl">
              The faster way to make real parts.
            </h2>

            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--pm-slate)] md:mt-6 md:text-lg lg:leading-8">
              Flux3D gives you a compact production workflow: upload the file, choose the right material, approve the quote, and receive a finished part without factory friction.
            </p>

            <div className="mt-6 space-y-3 md:mt-8">
              {productionLoop.map((item, index) => (
                <Reveal key={item.label} delay={(index + 1) * 40}>
                  <div className="premium-loop-row">
                    <item.icon className="h-5 w-5 text-[var(--pm-gold)]" />
                    <div>
                      <p className="text-sm font-bold text-[var(--pm-ink)]">{item.label}</p>
                      <p className="text-xs leading-5 text-[var(--pm-slate)]">{item.value}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4 md:gap-5">
          {painPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <Reveal key={point.id} delay={(index + 1) * 50}>
                <div
                  className="premium-problem-card bento-card-shimmer-shell group relative overflow-hidden rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-6 md:p-7 shadow-[var(--pm-shadow-sm)] hover:shadow-[var(--pm-shadow-md)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="bento-card-shimmer" />
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--pm-gold)] to-[var(--pm-gold-light)]`} />
                  <div className="grid gap-5 md:grid-cols-[120px_1fr] md:items-center">
                    <div className="premium-metric-tile">
                      <Icon className="h-6 w-6 text-[var(--pm-gold)]" />
                      <span className="text-[var(--pm-ink)]">{point.metric}</span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-[var(--pm-ink)]">
                        {point.problem}
                      </h3>
                      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-gold-faint)] p-4">
                        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[var(--pm-gold)]" />
                        <p className="text-sm leading-6 text-[var(--pm-slate)]">
                          {point.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}

          <Reveal delay={(painPoints.length + 1) * 50}>
            <a
              href="/instant-quote"
              className="premium-wide-link group"
            >
              Start with one file
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default memo(ProblemSection)
