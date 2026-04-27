'use client'

import { Layers, Gauge, PenTool, Box, Zap, Briefcase } from 'lucide-react'

const services = [
  {
    icon: Layers,
    title: 'Rapid Prototyping',
    description: 'Fast, accurate prototypes for design validation and testing. Iterate quickly with our high-speed FDM printing.',
    features: ['Same-day quotes', '24-48hr turnaround', 'Multiple materials'],
    price: 'From ₹99 / print'
  },
  {
    icon: Gauge,
    title: 'Automotive Jigs & Fixtures',
    description: 'Industrial-grade jigs, fixtures, and tooling for automotive manufacturing. Lightweight and durable.',
    features: ['High-strength materials', 'Custom designs', 'Batch pricing'],
    price: 'Custom pricing'
  },
  {
    icon: PenTool,
    title: 'Product Design & CAD',
    description: 'End-to-end design services from concept sketches to production-ready 3D models.',
    features: ['Professional CAD', 'Design optimization', 'GST invoice'],
    price: 'From ₹499 / model'
  },
  {
    icon: Box,
    title: 'Custom 3D Printing',
    description: 'Bespoke printing solutions for unique parts, miniatures, jewelry, and artistic creations.',
    features: ['High-detail resin', 'Multi-color options', 'Finishing services'],
    price: 'From ₹199 / print'
  },
  {
    icon: Zap,
    title: 'Express 24hr Service',
    description: 'Urgent prints dispatched within 24 hours. Available for Mumbai, Pune, and surrounding areas.',
    features: ['Priority queue', 'Quality check included', 'Fast shipping'],
    price: 'From ₹349 / print'
  },
  {
    icon: Briefcase,
    title: 'Bulk & Enterprise Orders',
    description: 'Volume production for startups, colleges, events, and enterprises with dedicated support.',
    features: ['Volume discounts', 'Dedicated account manager', 'Pan-India delivery'],
    price: 'Custom quote'
  },
]

export default function ServicesList() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">Our Services</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            Comprehensive 3D Printing <br /><span className="text-[#7a82a0]">Solutions</span>
          </h2>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1.5px] bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden">
          {services.map((service, i) => (
            <div
              key={i}
              className="bg-[#0d1120] p-8 transition-all duration-300 hover:bg-[#111827] group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FF5C1A] opacity-0 transition-opacity group-hover:opacity-100" />

              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-[rgba(255,92,26,0.08)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <service.icon className="w-6 h-6 text-[#FF5C1A]" />
              </div>

              {/* Title */}
              <h3 className="font-[var(--font-syne)] text-xl font-bold text-white mb-3">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-[#7a82a0] leading-[1.6] mb-4">
                {service.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {service.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-[#7a82a0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C1A]" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="text-sm text-[#FF5C1A] font-medium">
                {service.price}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
