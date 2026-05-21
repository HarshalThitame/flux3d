'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Award, Clock3, MessageCircle, ShieldCheck } from 'lucide-react'

const proofCards = [
  {
    icon: Clock3,
    title: 'Fast, planned turnaround',
    body: 'We estimate production around real print time, material prep, finishing, and dispatch instead of vague delivery promises.',
    metric: '3-5 days',
    label: 'typical delivery',
  },
  {
    icon: ShieldCheck,
    title: 'Production-minded quality',
    body: 'Parts are reviewed for orientation, strength, supports, finish, and visible issues before they leave the workshop.',
    metric: '100%',
    label: 'quality checked',
  },
  {
    icon: Award,
    title: 'Material-first guidance',
    body: 'We recommend materials based on load, temperature, finish, flexibility, and budget so the result matches the use case.',
    metric: '10+',
    label: 'materials',
  },
  {
    icon: MessageCircle,
    title: 'Direct project support',
    body: 'You can discuss the job directly with the team planning the print, especially when fit, finish, or deadlines matter.',
    metric: '1 hr',
    label: 'fast response',
  },
]

export default function WhyChooseUs() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="px-4 py-16 md:px-8 lg:px-16">
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-9 text-center"
        >
          <span className="text-xs font-bold uppercase text-[#6d28d9]">Why clients come back</span>
          <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold text-[#111827] md:text-4xl">
            Premium is not decoration. It is repeatable output.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6F7192]">
            The difference is in planning, material handling, communication, and finishing discipline before the printer even starts.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {proofCards.map((card, index) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#ede9fe] text-[#6d28d9]">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-extrabold text-[#111827]">{card.title}</h3>
              <p className="mt-3 min-h-[96px] text-sm leading-6 text-[#6F7192]">{card.body}</p>
              <div className="mt-5 rounded-lg border border-gray-100 bg-[#FAFBFD] p-4">
                <div className="text-2xl font-extrabold text-[#111827]">{card.metric}</div>
                <div className="mt-1 text-xs font-bold uppercase text-[#6F7192]">{card.label}</div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
