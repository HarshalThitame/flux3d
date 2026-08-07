'use client'

import { motion, useInView, type Variants } from 'framer-motion'
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
  PackageCheck,
  ShoppingBag,
} from 'lucide-react'

const services = [
  {
    icon: Factory,
    badge: 'Engineering',
    title: 'Spare Parts & Functional Prototypes',
    description: 'Replacement components, fixtures, housings, brackets, and fit-critical prototypes planned around strength, tolerance, and repeatability.',
    details: ['PETG, ABS, ASA, Nylon', 'Tolerance-led print planning', 'Low-volume production', 'Fit and finish checks'],
    spec: 'Functional grade',
    accent: 'from-emerald-500 to-teal-500',
    span: true,
  },
  {
    icon: Building2,
    badge: 'Architecture',
    title: 'Architecture Models & Maquettes',
    description: 'Presentation-ready scale models from CAD, Revit, Rhino, SketchUp, or drawings, with clean assemblies and refined surface finish.',
    details: ['Scale model planning', 'Multi-part assemblies', 'Smooth display finish', 'Presentation support'],
    spec: 'Display grade',
    accent: 'from-sky-500 to-indigo-500',
  },
  {
    icon: GraduationCap,
    badge: 'Education',
    title: 'Student Projects & Final Year Builds',
    description: 'Deadline-aware prints for working prototypes, demo models, robotics, enclosures, and academic presentation pieces.',
    details: ['Budget guidance', 'Deadline support', 'File preparation help', 'Project-ready delivery'],
    spec: 'Fast-track',
    accent: 'from-amber-400 to-orange-500',
  },
  {
    icon: ShoppingBag,
    badge: 'Products',
    title: 'Custom Products & Small-Batch Runs',
    description: 'Desk accessories, decor, organizers, branded objects, and niche product batches with color, finish, and consistency support.',
    details: ['Small-batch consistency', 'Custom colors', 'Assembly planning', 'Packaging-ready output'],
    spec: 'Batch ready',
    accent: 'from-violet-600 to-fuchsia-500',
    span: true,
  },
  {
    icon: HeartPulse,
    badge: 'Medical',
    title: 'Medical & Dental Models',
    description: 'High-detail anatomical, dental, and planning models using resin workflows suited for clarity, precision, and rapid review.',
    details: ['High-detail resin', 'Dental masters', 'Clinical review models', 'Fast urgent runs'],
    spec: 'Fine detail',
    accent: 'from-rose-500 to-pink-500',
  },
  {
    icon: Clapperboard,
    badge: 'Creative',
    title: 'Props, Costumes & Display Pieces',
    description: 'Large props, cosplay components, content production pieces, and paint-ready assemblies with wearable weight planning.',
    details: ['Large assemblies', 'Paint-ready surfaces', 'Lightweight parts', 'Reference matching'],
    spec: 'Paint ready',
    accent: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Gift,
    badge: 'Corporate',
    title: 'Corporate Gifts & Branded Objects',
    description: 'Custom trophies, branded desk items, event giveaways, and personalized gifting runs with consistent finish and delivery.',
    details: ['Brand integration', 'Bulk consistency', 'Premium packaging', 'Pan-India dispatch'],
    spec: 'Brand ready',
    accent: 'from-lime-500 to-emerald-500',
  },
]

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, delay: index * 0.055, ease: [0.16, 1, 0.3, 1] },
  }),
}

function ServiceCard({ service, index }: { service: typeof services[number]; index: number }) {
  const ref = useRef<HTMLElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-70px' })

  return (
    <motion.article
      ref={ref}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.2 }}
      className={`services-card-premium group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.06)] transition-colors hover:border-[#6d28d9]/30 ${
        service.span ? 'lg:col-span-2' : ''
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${service.accent}`} />
      <div className="absolute inset-x-5 top-0 h-px bg-white/80" />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="services-card-icon flex h-12 w-12 items-center justify-center rounded-lg bg-[#6d28d9] text-white shadow-[0_18px_38px_rgba(109,40,217,0.16)]">
          <service.icon className="h-5 w-5" />
        </div>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase text-slate-600">
          {service.badge}
        </span>
      </div>

      <div className="flex min-h-full flex-col">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#6d28d9]">
          <PackageCheck className="h-3.5 w-3.5" />
          {service.spec}
        </div>
        <h3 className="mt-3 !text-xl font-extrabold leading-tight !text-[#070b1d] transition-colors group-hover:!text-[#6d28d9]">
          {service.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#667085]">{service.description}</p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {service.details.map((detail) => (
            <div key={detail} className="flex items-center gap-2 text-sm font-semibold text-[#344054]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="leading-5">{detail}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500">Quote, material review, print planning included</span>
          <Link
            href="/instant-quote"
            className="services-card-action group/link inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#6d28d9] px-4 text-sm font-bold text-white transition hover:bg-[#4c1d95]"
          >
            Start
            <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

export default function ServicesList() {
  const ref = useRef<HTMLElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="service-portfolio" ref={ref} className="services-premium-section services-portfolio-section relative overflow-hidden bg-[#F4F6FA] px-4 py-24 md:px-8 lg:px-16">
      <div className="services-section-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.45fr)] lg:items-end"
        >
          <div>
            <span className="text-xs font-bold uppercase text-[#6d28d9]">Service portfolio</span>
            <h2 className="mt-3 max-w-3xl !text-[clamp(2rem,6vw,3rem)] font-extrabold leading-tight !text-[#070b1d] md:!text-5xl">
              Every print category, handled with the same production discipline.
            </h2>
          </div>
          <p className="text-sm leading-6 text-[#667085] lg:leading-7">
            Choose a specialization or upload your file directly. The workflow stays the same: material fit, print strategy, finishing plan, QC, and dispatch.
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
