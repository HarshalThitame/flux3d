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
    accent: 'from-[#C9A962] to-[#D4B978]',
  },
  {
    id: 2,
    icon: Banknote,
    metric: 'MOQ',
    problem: 'Factories push high minimums before the part is even proven.',
    solution: 'Print one fit-check part, then scale to a batch when it works.',
    accent: 'from-[#D4B978] to-[#C9A962]',
  },
  {
    id: 3,
    icon: Wrench,
    metric: 'Rework',
    problem: 'Every design change turns into another round of delay.',
    solution: 'Iterate overnight with material guidance and clean revision notes.',
    accent: 'from-[#B89A50] to-[#C9A962]',
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
    <section ref={ref} className="lux-section lux-band-cream lux-section-padding">
      <div className="mx-auto grid max-w-7xl items-start gap-8 md:gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="lg:sticky lg:top-28">
          <div>
            <div className="lux-eyebrow mb-4">Why Flux3D</div>

            <h2 className="lux-heading-1 mt-4 md:mt-5">
              The faster way to make real parts.
            </h2>

            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--lux-text-muted)] md:mt-6 md:text-lg lg:leading-8">
              Flux3D gives you a compact production workflow: upload the file, choose the right material, approve the quote, and receive a finished part without factory friction.
            </p>

            <div className="mt-6 space-y-3 md:mt-8">
              {productionLoop.map((item, index) => (
                <Reveal key={item.label} delay={(index + 1) * 40}>
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--lux-border-light)] bg-[var(--lux-bg-elevated)] p-3 shadow-[var(--lux-shadow-sm)]">
                    <item.icon className="h-5 w-5 text-[var(--lux-gold)]" />
                    <div>
                      <p className="text-sm font-bold text-[var(--lux-text-primary)]">{item.label}</p>
                      <p className="text-xs leading-5 text-[var(--lux-text-muted)]">{item.value}</p>
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
                  className="lux-card lux-card-gold-accent lux-shimmer-shell group relative overflow-hidden rounded-2xl p-6 md:p-7"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${point.accent}`} />
                  <div className="grid gap-5 md:grid-cols-[120px_1fr] md:items-center">
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--lux-border-light)] bg-[var(--lux-bg-muted)] p-4">
                      <Icon className="h-6 w-6 text-[var(--lux-gold)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--lux-text-primary)]">{point.metric}</span>
                    </div>

                    <div>
                      <h3 className="font-[var(--lux-font-display)] text-2xl font-semibold text-[var(--lux-text-primary)]">
                        {point.problem}
                      </h3>
                      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--lux-border-light)] bg-[var(--lux-gold-faint)] p-4">
                        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[var(--lux-gold)]" />
                        <p className="text-sm leading-6 text-[var(--lux-text-muted)]">
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
              className="lux-btn-ghost group"
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
