'use client'

import { motion, useInView, type Variants } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'
import { ArrowRight, MessageSquare, PackageCheck, Printer, UploadCloud } from 'lucide-react'

const steps = [
  {
    icon: UploadCloud,
    step: '01',
    title: 'Upload or describe',
    description: 'Send an STL, 3MF, STEP, sketch, reference image, or a clear description of what you need.',
    detail: 'Files, sketches, references',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: 'Material and quote review',
    description: 'We review requirements, suggest material and finish, then share a transparent quote and timeline.',
    detail: 'Material, finish, timeline',
  },
  {
    icon: Printer,
    step: '03',
    title: 'Print and finish',
    description: 'Your part is oriented, printed, inspected, and finished based on the selected service level.',
    detail: 'Slicing, production, finish',
  },
  {
    icon: PackageCheck,
    step: '04',
    title: 'Packed and delivered',
    description: 'Collect locally or receive secure Pan-India delivery with the finished part ready to use or present.',
    detail: 'QC, packing, dispatch',
  },
]

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function HowToOrder() {
  const ref = useRef<HTMLElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="services-premium-section services-order-section relative overflow-hidden bg-white px-4 py-24 md:px-8 lg:px-16">
      <div className="services-section-grid" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(340px,0.45fr)] lg:items-end"
        >
          <div>
            <span className="text-xs font-bold uppercase text-[#6d28d9]">Simple process</span>
            <h2 className="mt-3 max-w-3xl !text-4xl font-extrabold leading-tight !text-[#0F1B3D] md:!text-5xl">
              A precise path from file to finished part.
            </h2>
          </div>
          <p className="text-sm leading-7 text-[#667085]">
            Four controlled stages keep the job transparent, predictable, and easy to approve, even when fit, finish, or deadlines matter.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-slate-200 md:block lg:left-0 lg:right-0 lg:top-12 lg:h-px lg:w-full">
            <motion.div
              initial={{ scaleY: 0, scaleX: 0 }}
              animate={isInView ? { scaleY: 1, scaleX: 1 } : {}}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full origin-top bg-gradient-to-b from-[#6d28d9] to-emerald-500 lg:origin-left lg:bg-gradient-to-r"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-4">
            {steps.map((step, index) => (
              <motion.article
                key={step.title}
                custom={index}
                variants={itemVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                whileHover={{ y: -6 }}
                className="services-step-card relative rounded-lg border border-slate-200 bg-[#F8FAFC] p-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#6d28d9] text-white shadow-[0_16px_34px_rgba(109,40,217,0.18)]">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-extrabold text-[#6d28d9]">{step.step}</span>
                </div>
                <p className="mb-3 text-xs font-bold uppercase text-[#6b7280]">{step.detail}</p>
                <h3 className="!text-lg font-extrabold !text-[#0F1B3D]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#667085]">{step.description}</p>
              </motion.article>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.36, duration: 0.5 }}
          className="services-help-panel mt-8 rounded-lg border border-purple-200 bg-[#6d28d9] p-5 text-white shadow-[0_22px_60px_rgba(109,40,217,0.18)] md:flex md:items-center md:justify-between"
        >
          <div>
            <div className="text-sm font-extrabold text-white">Need help before uploading?</div>
            <p className="mt-1 text-sm leading-6 text-white/70">Send references, measurements, or photos. We can guide the next step.</p>
          </div>
          <Link
            href="/instant-quote"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#6d28d9] transition hover:bg-purple-50 md:mt-0"
          >
            Start Project
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
