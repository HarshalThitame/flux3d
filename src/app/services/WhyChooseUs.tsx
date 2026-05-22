'use client'

import { motion, useInView, type Variants } from 'framer-motion'
import { useRef } from 'react'
import { Award, Clock3, MessageCircle, ShieldCheck } from 'lucide-react'

const proofCards = [
  {
    icon: Clock3,
    title: 'Fast, planned turnaround',
    body: 'We estimate production around real print time, material prep, finishing, and dispatch instead of vague delivery promises.',
    metric: '3-5 days',
    label: 'typical delivery',
    accent: 'bg-amber-300',
  },
  {
    icon: ShieldCheck,
    title: 'Production-minded quality',
    body: 'Parts are reviewed for orientation, strength, supports, finish, and visible issues before they leave the workshop.',
    metric: '100%',
    label: 'quality checked',
    accent: 'bg-emerald-300',
  },
  {
    icon: Award,
    title: 'Material-first guidance',
    body: 'We recommend materials based on load, temperature, finish, flexibility, and budget so the result matches the use case.',
    metric: '10+',
    label: 'materials',
    accent: 'bg-violet-300',
  },
  {
    icon: MessageCircle,
    title: 'Direct project support',
    body: 'You can discuss the job directly with the team planning the print, especially when fit, finish, or deadlines matter.',
    metric: '1 hr',
    label: 'fast response',
    accent: 'bg-sky-300',
  },
]

const stages = ['File health', 'Material fit', 'Slicing strategy', 'Surface finish', 'Dispatch QC']

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function WhyChooseUs() {
  const ref = useRef<HTMLElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="services-premium-section services-proof-section relative overflow-hidden bg-[#0B1020] px-4 py-24 text-white md:px-8 lg:px-16">
      <div className="services-section-grid" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,0.5fr)] lg:items-end"
        >
          <div>
            <span className="text-xs font-bold uppercase text-[#c4b5fd]">Why clients come back</span>
            <h2 className="mt-3 max-w-3xl !text-4xl font-extrabold leading-tight !text-white md:!text-5xl">
              Premium is not decoration. It is controlled output.
            </h2>
          </div>
          <p className="text-sm leading-7 text-white/[0.64]">
            The difference is in planning, material handling, communication, and finishing discipline before the printer even starts.
          </p>
        </motion.div>

        <div className="mb-8 grid gap-3 lg:grid-cols-5">
          {stages.map((stage, index) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.18 + index * 0.06 }}
              className="services-gate-card relative rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase text-white/[0.52]">Gate {index + 1}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.7)]" />
              </div>
              <div className="text-sm font-extrabold text-white">{stage}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {proofCards.map((card, index) => (
            <motion.article
              key={card.title}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              whileHover={{ y: -6 }}
              className="services-proof-card rounded-lg border border-white/10 bg-white/[0.07] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[#101828]">
                  <card.icon className="h-5 w-5" />
                </div>
                <span className={`h-2.5 w-12 rounded-full ${card.accent}`} />
              </div>
              <div className="text-3xl font-extrabold text-white">{card.metric}</div>
              <div className="mt-1 text-xs font-bold uppercase text-white/[0.48]">{card.label}</div>
              <h3 className="mt-6 !text-lg font-extrabold !text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/[0.62]">{card.body}</p>
              <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.9, delay: 0.25 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full origin-left ${card.accent}`}
                />
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
