'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Settings as Gear, Building2, GraduationCap, ShoppingBag, Heart, Clapperboard, Gift, ArrowRight, Check } from 'lucide-react'

const services = [
  {
    icon: Gear,
    tag: 'Industrial',
    title: 'Industrial Spare Parts & Components',
    description: 'Reverse-engineer discontinued parts, print functional machine components, jigs, fixtures, and custom enclosures in engineering-grade materials.',
    pills: ['Prototypes', 'Machine Parts', 'Jigs & Fixtures', 'Custom Enclosures'],
    price: 'From ₹499 per part',
    cta: 'Get Industrial Quote →',
    color: 'from-[#7C5CFF] to-[#A78BFA]',
    span: true,
  },
  {
    icon: Building2,
    tag: 'Architecture',
    title: 'Architecture & Scale Models',
    description: 'Turn your blueprints into stunning physical scale models. Impress clients, win projects, and present final year submissions with models that speak louder than drawings.',
    pills: ['Building Models', 'Interior Layouts', 'Site Models', 'B.Arch Projects'],
    price: 'From ₹799 per model',
    badge: '15% Student Discount',
    cta: 'Get Architecture Quote →',
    color: 'from-[#A78BFA] to-[#A78BFA]',
  },
  {
    icon: GraduationCap,
    tag: 'Students',
    title: 'Built for Students. Priced for Hostels.',
    description: 'Submission tomorrow? Lab closed? Upload your file, pay online, and get your print delivered fast. No minimum order. Prints start at ₹99.',
    pills: ['Mini Projects', 'Assignments', 'Robotics', 'Quick Prints'],
    price: 'From ₹99 per print',
    badge: '10% off above ₹500',
    cta: 'Order Now →',
    color: 'from-[#7C5CFF] to-[#7C5CFF]',
  },
  {
    icon: ShoppingBag,
    tag: 'Products',
    title: 'Ready-to-Ship 3D Printed Products',
    description: 'Don\'t have a file? Shop our catalog of modern, designed-and-ready products — gaming accessories, desk setups, custom gifts, and home décor.',
    pills: ['Controller Stands', 'Gaming Accessories', 'Custom Gifts', 'Home Décor'],
    price: 'From ₹149 per product',
    cta: 'Shop Catalog →',
    color: 'from-[#A78BFA] to-[#A78BFA]',
  },
  {
    icon: Heart,
    tag: 'Medical & Dental',
    title: 'Medical & Dental 3D Printing',
    description: 'High-resolution dental models, surgical planning aids, anatomical study models, and medical device enclosures. Sub-0.1mm accuracy. NDA available.',
    pills: ['Dental Models', 'Surgical Planning', 'Anatomical Models', 'Device Enclosures'],
    price: 'From ₹999 per model',
    cta: 'Request Medical Quote →',
    color: 'from-[#EC4899] to-[#f472b6]',
  },
  {
    icon: Clapperboard,
    tag: 'Creators',
    title: 'Props & Sets for Creators Who Mean Business',
    description: 'Custom props, branded desk pieces, streamer accessories, cosplay parts, and channel merch — made exactly for your aesthetic.',
    pills: ['YouTube Props', 'Streamer Setup', 'Podcast Pieces', 'Cosplay Props'],
    price: 'From ₹299 per prop',
    badge: 'Tag us and get 15% off',
    cta: 'Build Your Setup →',
    color: 'from-[#8B5CF6] to-[#a78bfa]',
  },
  {
    icon: Gift,
    tag: 'Corporate',
    title: 'Corporate Gifts That Actually Get Kept',
    description: 'Custom logo pieces, personalized desk nameplates, and 3D printed trophies and awards that represent your brand with pride. Bulk pricing.',
    pills: ['Logo Pieces', 'Desk Name Plates', 'Awards & Trophies', 'Festive Gifts'],
    price: 'From ₹299 per unit (10+ units)',
    cta: 'Get Corporate Quote →',
    color: 'from-[#06B6D4] to-[#22d3ee]',
  },
]

function ServiceCard({ service, index }: { service: typeof services[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`group relative bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-2xl overflow-hidden transition-all duration-300 hover:border-[rgba(124, 92, 255,0.3)] hover:shadow-[0_8px_40px_rgba(124,92,255,0.08)] flex flex-col ${
        service.span ? 'md:col-span-2' : ''
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

      <div className="relative z-10 p-5 sm:p-6 md:p-8 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-4">
          <div className={`inline-flex items-center bg-gradient-to-r ${service.color} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
            {service.tag}
          </div>

          {service.badge && (
            <div className="inline-flex items-center gap-1 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#059669] text-xs font-medium px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              {service.badge}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${service.color} p-0.5 flex-shrink-0`}>
            <div className="w-full h-full rounded-xl bg-[#FFFFFF] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <service.icon className="w-7 h-7 text-[#0F1B3D]" />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="font-[var(--font-syne)] text-lg sm:text-xl font-bold text-[#0F1B3D] mb-2 group-hover:text-[#7C5CFF] transition-colors duration-300">
              {service.title}
            </h3>

            <p className="text-sm text-[#6F7192] leading-[1.6] mb-3 sm:mb-4 flex-1">
              {service.description}
            </p>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {service.pills.map((pill, j) => (
                <span
                  key={j}
                  className="text-[11px] sm:text-xs bg-[rgba(124, 92, 255,0.08)] text-[#6F7192] px-3 py-1 rounded-full border border-[rgba(124, 92, 255,0.12)]"
                >
                  {pill}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[rgba(124, 92, 255,0.08)]">
              <span className="text-sm text-[#7C5CFF] font-semibold">{service.price}</span>
              <a
                href="/instant-quote"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6F7192] hover:text-[#7C5CFF] transition-colors group/link min-h-[44px]"
              >
                {service.cta}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-full`} />
    </motion.div>
  )
}

export default function ServicesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="services" ref={ref} className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(124, 92, 255,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#7C5CFF] uppercase tracking-[3px] mb-4">What We Print</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            One Service.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
              Every Industry.
            </span>
          </h2>
          <p className="text-[#6F7192] mt-4 max-w-[600px] mx-auto">
            From a ₹99 student project to a ₹50,000 industrial batch — Flux 3D serves every segment with the same obsessive quality.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {services.map((service, i) => (
            <ServiceCard key={i} service={service} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="text-center bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-2xl p-8 hover:border-[rgba(124, 92, 255,0.3)] transition-colors duration-300"
        >
          <p className="text-lg text-[#0F1B3D] mb-2">Don&apos;t see your requirement above?</p>
          <p className="text-sm text-[#6F7192] mb-6">We do fully custom projects too.</p>
          <a
            href="/instant-quote"
            className="inline-flex items-center gap-2 bg-[#7C5CFF] text-white px-6 py-3 rounded-xl text-sm font-medium hover:shadow-[0_0_30px_rgba(124, 92, 255,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            Tell Us What You Need
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
