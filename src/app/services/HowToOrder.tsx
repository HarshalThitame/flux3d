'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Upload, MessageSquare, Printer, Package } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    step: '1',
    title: 'Upload or Describe',
    description: 'Drop your 3D file or simply share a concept, sketch, or reference image — we handle the rest.'
  },
  {
    icon: MessageSquare,
    step: '2',
    title: 'Quick Consultation',
    description: 'Our team reviews your requirements, suggests the ideal material, and shares a transparent quote.'
  },
  {
    icon: Printer,
    step: '3',
    title: 'Precision Printing',
    description: 'Your part is printed on professional equipment with careful attention to detail and quality checks.'
  },
  {
    icon: Package,
    step: '4',
    title: 'Delivery or Pickup',
    description: 'Collect locally from Pune or receive fast, secure Pan-India shipping with real-time updates.'
  }
]

function StepCard({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative flex flex-col items-center text-center"
    >
      {/* Step number circle */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        className="relative w-20 h-20 rounded-full bg-[#0d1120] border-2 border-[rgba(255,92,26,0.3)] flex items-center justify-center mb-6 group hover:border-[#FF5C1A] hover:shadow-[0_0_30px_rgba(255,92,26,0.2)] transition-all"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#ff7a3d] opacity-0 group-hover:opacity-10 transition-opacity" />
        <step.icon className="w-8 h-8 text-[#FF5C1A]" />

        {/* Step number badge */}
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#FF5C1A] text-white text-xs font-bold flex items-center justify-center shadow-lg">
          {step.step}
        </div>
      </motion.div>

      {/* Content */}
      <h3 className="font-[var(--font-syne)] text-lg font-bold text-white mb-3">
        {step.title}
      </h3>

      <p className="text-sm text-[#7a82a0] leading-[1.6] max-w-[250px]">
        {step.description}
      </p>

      {/* Connector line (except last) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5">
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: index * 0.15 + 0.3 }}
            className="w-full h-full bg-gradient-to-r from-[#FF5C1A] to-[rgba(255,92,26,0.1)]"
          />
        </div>
      )}
    </motion.div>
  )
}

export default function HowToOrder() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,92,26,0.03)] to-transparent pointer-events-none" />

      {/* Floating decorative circles */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 rounded-full bg-[rgba(255,92,26,0.05)] blur-xl"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-[rgba(80,100,255,0.05)] blur-xl"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">Simple Process</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            How It{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C1A] to-[#5064FF]">
              Works
            </span>
          </h2>
          <p className="text-[#7a82a0] mt-4 max-w-[500px] mx-auto">
            Four straightforward steps from your idea to a finished, production-ready part in your hands.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>

        {/* Bottom CTA hint */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-16"
        >
          <a
            href="/instant-quote"
            className="inline-flex items-center gap-2 text-[#FF5C1A] font-medium hover:underline"
          >
            Start your project now
            <span className="transition-transform hover:translate-x-1">→</span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
