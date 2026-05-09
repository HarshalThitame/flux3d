'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MessageCircle, Layers, Droplet, Shield, Wind, Zap, Sparkles, Palette, Gem, Package } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const materials = [
  {
    icon: Layers,
    name: 'PLA+',
    price: '₹8/g',
    traits: ['Easy to print', 'Biodegradable'],
    bestFor: 'Student projects, gifts, prototypes',
    color: 'from-[#10B981] to-[#34d399]'
  },
  {
    icon: Shield,
    name: 'PETG',
    price: '₹9/g',
    traits: ['Strong & food-safe', 'Heat resistant'],
    bestFor: 'Functional parts, containers, engineering',
    color: 'from-[#5064FF] to-[#7a8aff]'
  },
  {
    icon: Package,
    name: 'ABS',
    price: '₹10/g',
    traits: ['Industrial grade', 'High impact'],
    bestFor: 'Machine parts, enclosures, automotive',
    color: 'from-[#FF5C1A] to-[#ff7a3d]'
  },
  {
    icon: Wind,
    name: 'ASA',
    price: '₹11/g',
    traits: ['UV & weather resistant', 'Outdoor grade'],
    bestFor: 'Outdoor parts, automotive, signage',
    color: 'from-[#06B6D4] to-[#22d3ee]'
  },
  {
    icon: Droplet,
    name: 'TPU',
    price: '₹12/g',
    traits: ['Flexible & rubber-like', 'Shock absorbing'],
    bestFor: 'Grips, gaskets, wearables, phone cases',
    color: 'from-[#8B5CF6] to-[#a78bfa]'
  },
  {
    icon: Zap,
    name: 'Nylon PA12',
    price: '₹18/g',
    traits: ['Lightweight & strong', 'Chemical resistant'],
    bestFor: 'Industrial jigs, structural parts',
    color: 'from-[#F59E0B] to-[#fbbf24]'
  },
  {
    icon: Sparkles,
    name: 'Silk PLA',
    price: '₹10/g',
    traits: ['Premium metallic sheen', 'Gorgeous finish'],
    bestFor: 'Gifts, trophies, display models, décor',
    color: 'from-[#EC4899] to-[#f472b6]'
  },
  {
    icon: Palette,
    name: 'Multi-Color PLA',
    price: 'From ₹14/g',
    traits: ['4-color AMS system'],
    bestFor: 'Logos, figurines, prototypes, signage',
    color: 'from-[#FF5C1A] to-[#5064FF]'
  },
  {
    icon: Gem,
    name: 'Standard Resin 4K',
    price: '₹18/g',
    traits: ['Ultra fine detail', 'Smooth surface'],
    bestFor: 'Dental, miniatures, jewelry, props',
    color: 'from-[#10B981] to-[#5064FF]'
  },
  {
    icon: Shield,
    name: 'ABS-Like Resin',
    price: '₹20/g',
    traits: ['Tough & durable'],
    bestFor: 'Engineering prototypes, functional resin parts',
    color: 'from-[#F59E0B] to-[#FF5C1A]'
  }
]

export default function MaterialsSection() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(80,100,255,0.03)] to-transparent pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">Our Materials</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            10+ Premium Materials.{' '}
            <span className="text-[#7a82a0]">One Trusted Printer.</span>
          </h2>
          <p className="text-[#7a82a0] mt-4 max-w-[600px] mx-auto">
            Every filament and resin we stock is sourced from trusted brands — Bambu Lab, eSUN, Elegoo, and Sunlu. Quality you can see and feel in every layer.
          </p>
        </motion.div>

        {/* Materials grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-12">
          {materials.map((material, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 hover:border-[rgba(255,92,26,0.2)] transition-colors"
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${material.color} p-0.5 mb-4`}>
                <div className="w-full h-full rounded-lg bg-[#0d1120] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <material.icon className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Name + Price */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-[var(--font-syne)] text-base font-bold text-white group-hover:text-[#FF5C1A] transition-colors">
                  {material.name}
                </h3>
                <span className="text-sm text-[#FF5C1A] font-semibold">{material.price}</span>
              </div>

              {/* Traits */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {material.traits.map((trait, j) => (
                  <span key={j} className="text-[10px] bg-[rgba(255,255,255,0.05)] text-[#7a82a0] px-2 py-0.5 rounded-full">
                    {trait}
                  </span>
                ))}
              </div>

              {/* Best for */}
              <p className="text-xs text-[#4a5070]">Best for: {material.bestFor}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="text-center bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-2xl p-8"
        >
          <p className="text-lg text-white mb-2">Not sure which material is right for you?</p>
          <a
            href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl text-sm font-medium hover:shadow-[0_0_30px_rgba(37,211,102,0.3)] transition-shadow"
          >
            <MessageCircle className="w-4 h-4" />
            Talk to Our Expert on WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  )
}
