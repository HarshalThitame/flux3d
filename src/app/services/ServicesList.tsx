'use client'

import { Layers, Gauge, PenTool, Box, Zap, Briefcase } from 'lucide-react'

const services = [
  {
    icon: Layers,
    title: 'B2B Prototyping',
    description: 'Got a product idea stuck in CAD? We print functional prototypes that are strong enough to test and polished enough to show investors.',
    features: ['Same-day quotes', 'Fast-turnaround builds', 'Engineering materials'],
    price: 'From ₹99 / print'
  },
  {
    icon: Gauge,
    title: 'Automotive Jigs & Fixtures',
    description: 'Lightweight, durable tools and production aids built for workshops and manufacturing teams that need repeatable performance.',
    features: ['High-strength materials', 'Custom-fit production parts', 'Batch pricing'],
    price: 'Custom pricing'
  },
  {
    icon: PenTool,
    title: 'CAD + Print Package',
    description: 'No ready file? Send a sketch, image, or concept and get both design support and final print production in one streamlined workflow.',
    features: ['Professional CAD', 'Design optimization', 'Production-ready output'],
    price: 'From ₹499 / model'
  },
  {
    icon: Box,
    title: 'Custom 3D Printing',
    description: 'Unique parts, miniatures, custom products, branded models, and one-of-a-kind builds made to look premium from the first impression.',
    features: ['High-detail resin', 'Multi-color options', 'Presentation-ready finish'],
    price: 'From ₹199 / print'
  },
  {
    icon: Zap,
    title: 'Express Production',
    description: 'When the deadline is real, we move fast. Ideal for demos, investor meetings, urgent client presentations, and launch-ready parts.',
    features: ['Priority queue', 'Quality check included', 'Rush dispatch'],
    price: 'From ₹349 / print'
  },
  {
    icon: Briefcase,
    title: 'Bulk & Enterprise Orders',
    description: 'Volume production for startups, colleges, gifting brands, and businesses that need consistency, communication, and reliable delivery.',
    features: ['Volume discounts', 'Dedicated support', 'Pan-India delivery'],
    price: 'Custom quote'
  },
]

export default function ServicesList() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">What We Make For You</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            Every Project. Every Material. <br /><span className="text-[#7a82a0]">Every Detail.</span>
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
