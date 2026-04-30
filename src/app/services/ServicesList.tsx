'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Factory, Building2, GraduationCap, ShoppingBag, Heart, Clapperboard, Gift, ArrowRight } from 'lucide-react'

const services = [
  {
    icon: Factory,
    badge: 'Industrial-Grade',
    title: 'Spare Parts & Engineering',
    description: 'Replacement components for machinery, legacy systems, and custom tooling — printed on-demand with exact specs your production line needs.',
    details: [
      'High-strength PETG & Nylon',
      'Precision down to ±0.1mm',
      'Reverse engineering available',
      'Low-to-medium volume runs'
    ],
    cta: 'Upload Part Specs',
    color: 'from-[#FF5C1A] to-[#ff7a3d]',
    bgGradient: 'from-[rgba(255,92,26,0.08)] to-transparent'
  },
  {
    icon: Building2,
    badge: 'Architectural Precision',
    title: 'Architecture Models & Maquettes',
    description: 'Turn CAD files, Revit exports, or scale drawings into stunning physical models with clean details and presentation-ready finish.',
    details: [
      'Scale models from 1:100 to 1:500',
      'Smooth detailed surfaces',
      'Multi-part assembly',
      'SketchUp, Revit, Rhino compatible'
    ],
    cta: 'Get Model Quote',
    color: 'from-[#5064FF] to-[#7a8aff]',
    bgGradient: 'from-[rgba(80,100,255,0.08)] to-transparent'
  },
  {
    icon: GraduationCap,
    badge: 'Student-Friendly',
    title: 'Student Projects & Final Year',
    description: 'Affordable prints for college projects, prototypes, and presentations. Get your ideas in hand without breaking your budget.',
    details: [
      'Special student pricing',
      'File preparation guidance',
      'Fast turnaround for deadlines',
      'All disciplines supported'
    ],
    cta: 'Student Pricing',
    color: 'from-[#10B981] to-[#34d399]',
    bgGradient: 'from-[rgba(16,185,129,0.08)] to-transparent'
  },
  {
    icon: ShoppingBag,
    badge: 'Product-Ready',
    title: 'Custom 3D Printed Products',
    description: 'Lamps, planters, organizers, decorative pieces, and bespoke items — all fully customizable for your brand or personal use.',
    details: [
      'Custom colors and finishes',
      'Small-batch production',
      'Design assistance',
      'Packaging-friendly for resale'
    ],
    cta: 'Start a Product',
    color: 'from-[#F59E0B] to-[#fbbf24]',
    bgGradient: 'from-[rgba(245,158,11,0.08)] to-transparent'
  },
  {
    icon: Heart,
    badge: 'Medical-Grade',
    title: 'Medical & Dental Models',
    description: 'Patient-specific anatomical models, dental aligner masters, and surgical planning tools with biocompatible, high-detail resins.',
    details: [
      'Biocompatible resin options',
      'High-detail surgical models',
      'Dental aligner masters',
      'Fast turnaround for urgent cases'
    ],
    cta: 'Discuss Requirements',
    color: 'from-[#EC4899] to-[#f472b6]',
    bgGradient: 'from-[rgba(236,72,153,0.08)] to-transparent'
  },
  {
    icon: Clapperboard,
    badge: 'Film & Content',
    title: 'Props, Costumes & Cosplay',
    description: 'From helmet replicas to full-size armor pieces, character props, and film set components — lightweight and paint-ready.',
    details: [
      'Lightweight wearable prints',
      'Paint-ready surfaces',
      'Large-scale assemblies',
      'Rush orders available'
    ],
    cta: 'Send Reference',
    color: 'from-[#8B5CF6] to-[#a78bfa]',
    bgGradient: 'from-[rgba(139,92,246,0.08)] to-transparent'
  },
  {
    icon: Gift,
    badge: 'Business Gifting',
    title: 'Corporate Gifts & Branding',
    description: 'Custom 3D printed trophies, branded desk accessories, event giveaways, and personalized corporate gifts for your team or clients.',
    details: [
      'Custom branding integration',
      'Bulk orders consistent quality',
      'Premium packaging options',
      'Pan-India delivery'
    ],
    cta: 'Request Bulk Quote',
    color: 'from-[#06B6D4] to-[#22d3ee]',
    bgGradient: 'from-[rgba(6,182,212,0.08)] to-transparent'
  }
]

function ServiceCard({ service, index }: { service: typeof services[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const isEven = index % 2 === 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className={`group relative ${
        index === 0 ? 'md:col-span-2' : index === 3 ? 'md:col-span-2' : ''
      }`}
    >
      <div className="relative h-full bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden hover:border-[rgba(255,92,26,0.3)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,92,26,0.08)]">
        {/* Hover glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${service.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        <div className="relative z-10 p-6 md:p-8">
          {/* Badge */}
          <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r ${service.color} text-white text-xs font-semibold px-3 py-1 rounded-full mb-4`}>
            {service.badge}
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} p-0.5 flex-shrink-0`}>
              <div className="w-full h-full rounded-xl bg-[#0d1120] flex items-center justify-center group-hover:scale-105 transition-transform">
                <service.icon className="w-7 h-7 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-[var(--font-syne)] text-xl font-bold text-white mb-2 group-hover:text-[#FF5C1A] transition-colors">
                {service.title}
              </h3>

              <p className="text-sm text-[#7a82a0] leading-[1.6] mb-4">
                {service.description}
              </p>

              {/* Details grid */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                {service.details.map((detail, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-[#7a82a0]">
                    <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${service.color}`} />
                    {detail}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="/instant-quote"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#7a82a0] hover:text-[#FF5C1A] transition-colors group/link"
              >
                {service.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </a>
            </div>
          </div>
        </div>

        {/* Corner accent */}
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${service.color} opacity-0 group-hover:opacity-10 transition-opacity rounded-bl-full`} />
      </div>
    </motion.div>
  )
}

export default function ServicesList() {
  return (
    <section className="py-24 px-6 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(255,92,26,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">7 Specializations</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            Every Industry. Every Need. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C1A] to-[#5064FF]">
              One Printing Partner.
            </span>
          </h2>
          <p className="text-[#7a82a0] mt-4 max-w-[600px] mx-auto">
            From heavy-duty engineering parts to delicate presentation models — pick your specialization and we handle the rest.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <ServiceCard key={i} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
