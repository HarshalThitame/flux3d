'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clapperboard,
  Factory,
  Gift,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
} from 'lucide-react'

const services = [
  {
    icon: Factory,
    badge: 'Engineering',
    title: 'Spare Parts & Functional Prototypes',
    description: 'Replacement components, fixtures, housings, brackets, and engineering prototypes built around strength, tolerance, and repeatability.',
    details: ['PETG, ABS, ASA, Nylon', 'Tolerance-led print planning', 'Low-volume production', 'Fit and finish checks'],
  },
  {
    icon: Building2,
    badge: 'Architecture',
    title: 'Architecture Models & Maquettes',
    description: 'Presentation-ready scale models from CAD, Revit, Rhino, SketchUp, or drawings, with clean assemblies and refined surface finish.',
    details: ['Scale model planning', 'Multi-part assemblies', 'Smooth display finish', 'Presentation support'],
  },
  {
    icon: GraduationCap,
    badge: 'Education',
    title: 'Student Projects & Final Year Builds',
    description: 'Affordable, deadline-aware prints for working prototypes, demo models, robotics, enclosures, and academic presentation pieces.',
    details: ['Budget guidance', 'Deadline support', 'File preparation help', 'Project-ready delivery'],
  },
  {
    icon: ShoppingBag,
    badge: 'Products',
    title: 'Custom Products & Small-Batch Runs',
    description: 'Desk accessories, decor, organizers, branded objects, and niche product batches with material, color, and finishing support.',
    details: ['Small-batch consistency', 'Custom colors', 'Assembly planning', 'Packaging-ready output'],
  },
  {
    icon: HeartPulse,
    badge: 'Medical',
    title: 'Medical & Dental Models',
    description: 'High-detail anatomical, dental, and planning models using resin workflows suited for clarity, precision, and rapid review.',
    details: ['High-detail resin', 'Dental masters', 'Clinical review models', 'Fast urgent runs'],
  },
  {
    icon: Clapperboard,
    badge: 'Creative',
    title: 'Props, Costumes & Display Pieces',
    description: 'Large props, cosplay components, content production pieces, and paint-ready assemblies with wearable weight planning.',
    details: ['Large assemblies', 'Paint-ready surfaces', 'Lightweight parts', 'Reference matching'],
  },
  {
    icon: Gift,
    badge: 'Corporate',
    title: 'Corporate Gifts & Branded Objects',
    description: 'Custom trophies, branded desk items, event giveaways, and personalized gifting runs with consistent finish and delivery.',
    details: ['Brand integration', 'Bulk consistency', 'Premium packaging', 'Pan-India dispatch'],
  },
]

function ServiceCard({ service, index }: { service: typeof services[number]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className={`group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#6d28d9]/25 hover:shadow-[0_20px_60px_rgba(17,24,39,0.10)] ${
        index === 0 || index === 3 ? 'lg:col-span-2' : ''
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#111827] text-white shadow-[0_14px_30px_rgba(17,24,39,0.16)]">
          <service.icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-bold uppercase text-[#6d28d9]">
          {service.badge}
        </span>
      </div>

      <h3 className="text-xl font-extrabold leading-tight text-[#111827] transition-colors group-hover:text-[#6d28d9]">
        {service.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[#4B5563]">{service.description}</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {service.details.map((detail) => (
          <div key={detail} className="flex items-center gap-2 text-sm font-semibold text-[#374151]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {detail}
          </div>
        ))}
      </div>

      <Link
        href="/instant-quote"
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-[#FAFBFD] px-4 text-sm font-bold text-[#111827] transition hover:border-[#6d28d9]/30 hover:bg-white hover:text-[#6d28d9]"
      >
        Start this service
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.article>
  )
}

export default function ServicesList() {
  return (
    <section className="px-4 py-16 md:px-8 lg:px-16">
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase text-[#6d28d9]">Service portfolio</span>
            <h2 className="mt-2 max-w-3xl text-3xl font-extrabold text-[#111827] md:text-4xl">
              Built for engineers, designers, founders, creators, and teams.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#6F7192]">
            Choose a specialization or upload a file directly. We guide material, orientation, finish, and delivery from there.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ServiceCard key={service.title} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
