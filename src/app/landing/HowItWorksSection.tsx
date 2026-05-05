'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Upload, MessageSquare, CreditCard, Printer, Package, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    step: '1',
    title: 'Upload Your File',
    description: 'Send us your STL, STEP, DXF, or OBJ file via our website or WhatsApp. Don\'t have a file? Describe your idea — our team will handle the modeling.'
  },
  {
    icon: MessageSquare,
    step: '2',
    title: 'Get an Instant Quote',
    description: 'Standard prints are auto-quoted in seconds. Custom and industrial orders get a manual quote within 2 hours. No hidden charges, ever.'
  },
  {
    icon: CreditCard,
    step: '3',
    title: 'Pay Securely Online',
    description: 'UPI · Razorpay · Google Pay · PhonePe · Debit/Credit Cards · Net Banking · Cash on Delivery in select cities.'
  },
  {
    icon: Printer,
    step: '4',
    title: 'We Print & Quality Check',
    description: 'Your part is printed on our Bambu Lab P2S fleet, photographed at every stage, and inspected before packing.'
  },
  {
    icon: Package,
    step: '5',
    title: 'Delivered to Your Door',
    description: 'Shipped via Delhivery or Shiprocket with live tracking. Pan-India delivery in 3–5 days.'
  }
]

export default function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,92,26,0.03)] to-transparent pointer-events-none" />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 rounded-full bg-[rgba(255,92,26,0.05)] blur-xl"
        style={{ opacity: 1 }}
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-[rgba(80,100,255,0.05)] blur-xl"
        style={{ opacity: 1 }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">The Process</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            From File to Doorstep{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C1A] to-[#5064FF]">
              in 5 Steps.
            </span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[#FF5C1A] via-[rgba(255,92,26,0.3)] to-[#FF5C1A]" />

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
                  className="relative w-20 h-20 rounded-full bg-[#0d1120] border-2 border-[rgba(255,92,26,0.3)] flex items-center justify-center mb-6 hover:border-[#FF5C1A] hover:shadow-[0_0_30px_rgba(255,92,26,0.2)] transition-all z-10"
                >
                  <step.icon className="w-8 h-8 text-[#FF5C1A]" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#FF5C1A] text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {step.step}
                  </div>
                </motion.div>

                {/* Content */}
                <h3 className="font-[var(--font-syne)] text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-[#7a82a0] leading-[1.6] max-w-[200px]">{step.description}</p>
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
          <p className="text-lg text-white mb-4">Ready to start?</p>
          <a href="/instant-quote" className="inline-flex items-center gap-2 bg-[#FF5C1A] text-white px-8 py-3 rounded-xl font-medium hover:shadow-[0_0_30px_rgba(255,92,26,0.3)] transition-shadow">
            Upload Your File Now
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
