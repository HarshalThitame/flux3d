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
    color: 'from-[#FF5C1A] to-[#ff7a3d]'
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
    color: 'from-[#5064FF] to-[#7a8aff]'
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
    color: 'from-[#10B981] to-[#34d399]'
  },
  {
    icon: ShoppingBag,
    tag: 'Products',
    title: 'Ready-to-Ship 3D Printed Products',
    description: 'Don\'t have a file? Shop our catalog of modern, designed-and-ready products — gaming accessories, desk setups, custom gifts, and home décor.',
    pills: ['Controller Stands', 'Gaming Accessories', 'Custom Gifts', 'Home Décor'],
    price: 'From ₹149 per product',
    cta: 'Shop Catalog →',
    color: 'from-[#F59E0B] to-[#fbbf24]'
  },
  {
    icon: Heart,
    tag: 'Medical & Dental',
    title: 'Medical & Dental 3D Printing',
    description: 'High-resolution dental models, surgical planning aids, anatomical study models, and medical device enclosures. Sub-0.1mm accuracy. NDA available.',
    pills: ['Dental Models', 'Surgical Planning', 'Anatomical Models', 'Device Enclosures'],
    price: 'From ₹999 per model',
    cta: 'Request Medical Quote →',
    color: 'from-[#EC4899] to-[#f472b6]'
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
    color: 'from-[#8B5CF6] to-[#a78bfa]'
  },
  {
    icon: Gift,
    tag: 'Corporate',
    title: 'Corporate Gifts That Actually Get Kept',
    description: 'Custom logo pieces, personalized desk nameplates, and 3D printed trophies and awards that represent your brand with pride. Bulk pricing. GST invoice.',
    pills: ['Logo Pieces', 'Desk Name Plates', 'Awards & Trophies', 'Festive Gifts'],
    price: 'From ₹299 per unit (10+ units)',
    cta: 'Get Corporate Quote →',
    color: 'from-[#06B6D4] to-[#22d3ee]'
  }
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
      className={`group relative bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden hover:border-[rgba(255,92,26,0.3)] transition-all duration-300 ${
        index === 0 ? 'md:col-span-2' : ''
      }`}
    >
      {/* Hover glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

       <div className={`relative z-10 p-5 sm:p-6 md:p-8`}>
        {/* Tag */}
        <div className={`inline-flex items-center bg-gradient-to-r ${service.color} text-white text-xs font-semibold px-3 py-1 rounded-full mb-4`}>
          {service.tag}
        </div>

        {/* Badge */}
        {service.badge && (
          <div className="inline-flex items-center gap-1 ml-3 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10B981] text-xs font-medium px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" />
            {service.badge}
          </div>
        )}

         <div className="flex flex-col sm:flex-row gap-4 mt-4">
           {/* Icon */}
           <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${service.color} p-0.5 flex-shrink-0`}>
            <div className="w-full h-full rounded-xl bg-[#0d1120] flex items-center justify-center group-hover:scale-110 transition-transform">
              <service.icon className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
             <h3 className="font-[var(--font-syne)] text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-[#FF5C1A] transition-colors">
               {service.title}
             </h3>
 
             <p className="text-sm text-[#7a82a0] leading-[1.6] mb-3 sm:mb-4">{service.description}</p>
 
             {/* Pills */}
             <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
               {service.pills.map((pill, j) => (
                 <span key={j} className="text-[11px] sm:text-xs bg-[rgba(255,255,255,0.05)] text-[#7a82a0] px-2 py-0.5 sm:py-1 rounded-full">
                   {pill}
                 </span>
               ))}
             </div>
 
             {/* Price + CTA */}
             <div className="flex items-center justify-between">
               <span className="text-sm text-[#FF5C1A] font-medium">{service.price}</span>
               <a href="/instant-quote" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7a82a0] hover:text-[#FF5C1A] transition-colors group/link min-h-[44px]">
                 {service.cta}
                 <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
               </a>
             </div>
          </div>
        </div>
      </div>

      {/* Corner accent */}
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${service.color} opacity-0 group-hover:opacity-10 transition-opacity rounded-bl-full`} />
    </motion.div>
  )
}

export default function ServicesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="services" ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(255,92,26,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">What We Print</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            One Service.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C1A] to-[#5064FF]">
              Every Industry.
            </span>
          </h2>
          <p className="text-[#7a82a0] mt-4 max-w-[600px] mx-auto">
            From a ₹99 student project to a ₹50,000 industrial batch — Flux 3D serves every segment with the same obsessive quality.
          </p>
        </motion.div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {services.map((service, i) => (
            <ServiceCard key={i} service={service} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="text-center bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-2xl p-8"
        >
          <p className="text-lg text-white mb-2">Don&apos;t see your requirement above?</p>
          <p className="text-sm text-[#7a82a0] mb-6">We do fully custom projects too.</p>
          <a href="/instant-quote" className="inline-flex items-center gap-2 bg-[#FF5C1A] text-white px-6 py-3 rounded-xl text-sm font-medium hover:shadow-[0_0_30px_rgba(255,92,26,0.3)] transition-shadow">
            Tell Us What You Need
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
