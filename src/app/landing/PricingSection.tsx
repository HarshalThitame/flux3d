'use client'

import { motion, useInView } from '@/lib/motion'
import { useRef } from 'react'
import { Check, ArrowRight, Star } from 'lucide-react'

const tiers = [
  {
    name: 'Starter',
    bestFor: 'Students & hobbyists',
    price: '₹99',
    priceLabel: 'From',
    description: 'Perfect for small, single-color prints under 50g.',
    features: [
      'FDM printing (PLA+)',
      'Standard speed',
      'Up to 50g print weight',
      '3–5 day delivery',
      'WhatsApp support'
    ],
    cta: 'Start Printing →',
    popular: false,
    color: 'from-[#A78BFA] to-[#A78BFA]'
  },
  {
    name: 'Standard',
    bestFor: 'Professionals & small businesses',
    price: '₹499',
    priceLabel: 'From',
    description: 'Ideal for functional parts, architecture models, and product prototypes.',
    features: [
      'FDM or Resin printing',
      'All material options',
      'Multi-color (AMS) available',
      '48hr turnaround available',
      'Priority queue',
      'Photo update before dispatch',
      'Dedicated support'
    ],
    cta: 'Get Standard Quote →',
    popular: true,
    color: 'from-[#7C5CFF] to-[#A78BFA]'
  },
  {
    name: 'Enterprise',
    bestFor: 'Industrial, medical & bulk',
    price: 'Custom',
    priceLabel: '',
    description: 'High-volume, high-complexity orders with dedicated account management.',
    features: [
      'Unlimited order volume',
      'Engineering-grade materials',
      'Tolerances up to ±0.2mm',
      'NDA / confidentiality',
      'Express 24hr guaranteed',
      'Multi-address delivery',
      'Bulk pricing (up to 30% off)',
      'Dedicated account manager'
    ],
    cta: 'Talk to Enterprise Team →',
    popular: false,
    color: 'from-[#7C5CFF] to-[#7C5CFF]'
  }
]

const priceTable = [
  { material: 'PLA+', price: '₹8/g', notes: 'Most affordable' },
  { material: 'PETG', price: '₹9/g', notes: 'Food-safe option' },
  { material: 'ABS', price: '₹10/g', notes: 'Industrial grade' },
  { material: 'TPU', price: '₹12/g', notes: 'Flexible rubber' },
  { material: 'Silk PLA', price: '₹10/g', notes: 'Premium finish' },
  { material: 'Resin 4K', price: '₹18/g', notes: 'Ultra fine detail' },
  { material: 'Multi-Color', price: 'From ₹14/g', notes: 'AMS system' },
  { material: 'Nylon PA12', price: '₹18/g', notes: 'Engineering grade' }
]

export default function PricingSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_30%,rgba(124, 92, 255,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#5B3FD6] uppercase tracking-[3px] mb-4">Transparent Pricing</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            No Hidden Charges.{' '}
            <span className="text-[#6F7192]">No Surprises.</span>
          </h2>
            <p className="text-[#6F7192] mt-4 max-w-[600px] mx-auto">
              What you see is what you pay. Every quote includes material cost and print time.
            </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className={`relative bg-[#FFFFFF] border rounded-2xl p-8 ${
                tier.popular
                  ? 'border-[#7C5CFF] shadow-[0_0_40px_rgba(124, 92, 255,0.15)]'
                  : 'border-[rgba(124, 92, 255,0.5)]'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7C5CFF] text-white text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <p className="text-xs text-[#6F7192] uppercase tracking-wider mb-1">Best for: {tier.bestFor}</p>
              <h3 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D] mb-2">{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                {tier.priceLabel && <span className="text-sm text-[#6F7192]">{tier.priceLabel}</span>}
                <span className="font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D]">{tier.price}</span>
              </div>
              <p className="text-sm text-[#6F7192] mb-6">{tier.description}</p>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-[#6F7192]">
                    <Check className="w-4 h-4 text-[#5B3FD6] mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="/instant-quote"
                className={`inline-flex items-center justify-center w-full gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  tier.popular
                    ? 'bg-[#7C5CFF] text-white hover:shadow-[0_0_30px_rgba(124, 92, 255,0.3)]'
                    : 'bg-[rgba(124, 92, 255,0.4)] text-white border border-[rgba(124, 92, 255,0.5)] hover:border-[#7C5CFF]'
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          ))}
        </div>

        {/* Pricing note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-xl p-6 mb-16"
        >
          <p className="text-sm text-[#6F7192] text-center">
            💡 Shipping calculated at checkout · Express surcharge: +30% · Student discount: 10% off above ₹500
          </p>
        </motion.div>

        {/* Price table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
        >
          <h3 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D] mb-6 text-center">Price Per Gram Reference</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(124, 92, 255,0.5)]">
                  <th className="text-left py-3 px-4 text-[#6F7192] font-medium">Material</th>
                  <th className="text-left py-3 px-4 text-[#6F7192] font-medium">Price</th>
                  <th className="text-left py-3 px-4 text-[#6F7192] font-medium hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {priceTable.map((row, i) => (
                  <tr key={i} className="border-b border-[rgba(124, 92, 255,0.25)] hover:bg-[rgba(124, 92, 255,0.2)]">
                    <td className="py-3 px-4 text-[#0F1B3D] font-medium">{row.material}</td>
                    <td className="py-3 px-4 text-[#5B3FD6]">{row.price}</td>
                    <td className="py-3 px-4 text-[#6F7192] hidden sm:table-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shipping */}
          <div className="mt-8 bg-[rgba(124, 92, 255,0.25)] rounded-xl p-6">
            <h4 className="text-sm font-semibold text-[#0F1B3D] mb-3">Shipping</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2 text-[#6F7192]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]" />
                Mumbai & Pune: ₹60 flat
              </div>
              <div className="flex items-center gap-2 text-[#6F7192]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]" />
                Pan India: ₹100 flat
              </div>
              <div className="flex items-center gap-2 text-[#6F7192]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]" />
                Free above ₹2,000
              </div>
              <div className="flex items-center gap-2 text-[#6F7192]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]" />
                Express 24hr: Mumbai & Pune
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
