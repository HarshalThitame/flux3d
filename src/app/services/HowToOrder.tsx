'use client'

import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'
import { ArrowRight, MessageSquare, PackageCheck, Printer, UploadCloud } from 'lucide-react'

const steps = [
  {
    icon: UploadCloud,
    step: '01',
    title: 'Upload or describe',
    description: 'Send an STL, 3MF, STEP, sketch, reference image, or a clear description of what you need.',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: 'Material and quote review',
    description: 'We review requirements, suggest material and finish, then share a transparent quote and timeline.',
  },
  {
    icon: Printer,
    step: '03',
    title: 'Print and finish',
    description: 'Your part is oriented, printed, inspected, and finished based on the selected service level.',
  },
  {
    icon: PackageCheck,
    step: '04',
    title: 'Packed and delivered',
    description: 'Collect locally or receive secure Pan-India delivery with the finished part ready to use or present.',
  },
]

export default function HowToOrder() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="px-4 py-16 md:px-8 lg:px-16">
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase text-[#6d28d9]">Simple process</span>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold text-[#111827] md:text-4xl">
              A clear path from file to finished part.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#6F7192]">
            Four controlled steps keep the job transparent, predictable, and easy to approve.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.07 }}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#111827] text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-extrabold text-[#6d28d9]">{step.step}</span>
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-[#111827]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6F7192]">{step.description}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35 }}
          className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:flex md:items-center md:justify-between"
        >
          <div>
            <div className="text-sm font-extrabold text-[#111827]">Need help before uploading?</div>
            <p className="mt-1 text-sm leading-6 text-[#6F7192]">Send references, measurements, or photos. We can guide the next step.</p>
          </div>
          <Link
            href="/instant-quote"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#111827] px-5 text-sm font-bold text-white transition hover:bg-[#2f3341] md:mt-0"
          >
            Start Project
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
