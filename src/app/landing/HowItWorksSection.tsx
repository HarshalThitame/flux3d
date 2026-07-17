'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Upload, MessageSquare, CreditCard, Printer, Package, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    step: '1',
    title: 'Share Your Requirement',
    description: 'Upload a design file or describe the part, product or model you need. We review the request before confirming the order.'
  },
  {
    icon: MessageSquare,
    step: '2',
    title: 'Receive a Quotation',
    description: 'We confirm the material, colour, quantity, finish, shipping and production details, then send the final price or quote.'
  },
  {
    icon: CreditCard,
    step: '3',
    title: 'Pay Securely Online',
    description: 'Payments are handled through the checkout flow with server-side verification before an order is marked paid.'
  },
  {
    icon: Printer,
    step: '4',
    title: 'Production and QC',
    description: 'The order is manufactured, checked, and prepared for dispatch after the final approved specifications are locked in.'
  },
  {
    icon: Package,
    step: '5',
    title: 'Delivered to You',
    description: 'The completed order is shipped to a serviceable location in India. Tracking is shared when available.'
  }
]

export default function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(109, 40, 217,0.03)] to-transparent pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#6d28d9] uppercase tracking-normal mb-4">The Process</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-normal leading-[1.1]">
            From Requirement to Dispatch{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6d28d9] to-[#a855f7]">
              in 5 Steps.
            </span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[#6d28d9] via-[rgba(109, 40, 217,0.3)] to-[#6d28d9]" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step circle */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="relative w-20 h-20 rounded-full bg-[#faf9f7] border-2 border-[rgba(109, 40, 217,0.3)] flex items-center justify-center mb-6 hover:border-[#6d28d9] hover:shadow-[0_0_30px_rgba(109, 40, 217,0.2)] transition-all z-10"
                >
                  <step.icon className="w-8 h-8 text-[#6d28d9]" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#6d28d9] text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {step.step}
                  </div>
                </motion.div>

                {/* Content */}
                <h3 className="font-[var(--font-syne)] text-base font-bold text-[#0F1B3D] mb-2">{step.title}</h3>
                <p className="text-xs text-[#6F7192] leading-[1.6] max-w-[200px]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="text-center mt-16"
        >
          <p className="text-lg text-[#0F1B3D] mb-4">Ready to start?</p>
          <a href="/contact" className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-8 py-3 rounded-xl font-medium hover:shadow-[0_0_30px_rgba(109, 40, 217,0.3)] transition-shadow">
            Request a Quote
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
