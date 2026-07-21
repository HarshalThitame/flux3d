'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Hourglass, Banknote, Wrench, ArrowRight, CheckCircle2, ScanLine, Gauge } from 'lucide-react'

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

export default function ProblemSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="premium-problem relative z-10 w-full overflow-hidden px-4 py-24 md:px-8 lg:px-16">
      <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="lg:sticky lg:top-28"
        >
          <span className="premium-eyebrow">Why Flux3D</span>

          <h2 className="mt-5 text-[clamp(2rem,6vw,4rem)] font-black leading-[0.98] tracking-normal text-[#0F1B3D] md:text-5xl lg:text-6xl">
            The faster way to make real parts.
          </h2>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#6F7192] md:text-lg lg:leading-8">
            Flux3D gives you a compact production workflow: upload the file, choose the right material, approve the quote, and receive a finished part without factory friction.
          </p>

          <div className="mt-8 space-y-3">
            {productionLoop.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -18 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="premium-loop-row"
              >
                <item.icon className="h-5 w-5 text-[#6d28d9]" />
                <div>
                  <p className="text-sm font-bold text-[#0F1B3D]">{item.label}</p>
                  <p className="text-xs leading-5 text-[#6F7192]">{item.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-5">
          {painPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <motion.div
                key={point.id}
                initial={{ opacity: 0, y: 32 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.12 + index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="premium-problem-card group relative overflow-hidden rounded-2xl border border-[rgba(109,40,217,0.08)] bg-white p-6 md:p-7"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${point.accent}`} />
                <div className="grid gap-5 md:grid-cols-[120px_1fr] md:items-center">
                  <div className="premium-metric-tile">
                    <Icon className="h-6 w-6 text-[#6F7192]" />
                    <span>{point.metric}</span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-[#0F1B3D]">
                      {point.problem}
                    </h3>
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-[rgba(109,40,217,0.08)] bg-[rgba(109,40,217,0.03)] p-4">
                      <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[#6d28d9]" />
                      <p className="text-sm leading-6 text-[#6F7192]">
                        {point.solution}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}

          <motion.a
            href="/instant-quote"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.48 }}
            className="premium-wide-link group"
          >
            Start with one file
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.a>
        </div>
      </div>
    </section>
  )
}
