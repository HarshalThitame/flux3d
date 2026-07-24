'use client'

import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Upload, MessageSquare, CreditCard, Printer, Package, ArrowRight, ChevronRight } from 'lucide-react'

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

const gradients = [
  'from-[#6d28d9] to-[#7c3aed]',
  'from-[#7c3aed] to-[#8b5cf6]',
  'from-[#8b5cf6] to-[#a855f7]',
  'from-[#a855f7] to-[#c084fc]',
  'from-[#c084fc] to-[#6d28d9]'
]

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activeIndex, setActiveIndex] = useState(0)

  const { scrollXProgress } = useScroll({ container: scrollRef })
  const progressWidth = useTransform(scrollXProgress, [0, 1], ['0%', '100%'])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const cardWidth = container.offsetWidth * 0.85
      const index = Math.round(scrollLeft / cardWidth)
      setActiveIndex(Math.min(index, steps.length - 1))
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section ref={ref} className="relative py-12 px-6 md:py-16 lg:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(109, 40, 217,0.03)] to-transparent pointer-events-none" />

      {/* Mobile cinematic background glow */}
      <div className="absolute inset-0 md:hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[60%] bg-gradient-to-r from-[#6d28d9]/10 via-[#a855f7]/15 to-[#6d28d9]/10 blur-3xl" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-8 md:mb-12 lg:mb-16"
        >
          <p className="text-sm font-medium text-[#6d28d9] uppercase tracking-normal mb-4">The Process</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-normal leading-[1.1]">
            From Requirement to Dispatch{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6d28d9] to-[#a855f7]">
              in 5 Steps.
            </span>
          </h2>
        </motion.div>

        {/* Mobile: Horizontal Carousel */}
        <div className="md:hidden">
          {/* Progress bar */}
          <div className="mb-6 h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#6d28d9] to-[#a855f7] rounded-full"
              style={{ width: progressWidth }}
            />
          </div>

          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-6 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="snap-center shrink-0 w-[85vw]"
              >
                {/* Cinematic Card */}
                <div className="relative group">
                  {/* Animated gradient border */}
                  <div className={`absolute -inset-[2px] rounded-2xl bg-gradient-to-r ${gradients[i]} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`} />
                  
                  {/* Card content */}
                  <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(109, 40, 217,0.1)] shadow-[0_8px_32px_rgba(109, 40, 217,0.08)]">
                    {/* Large watermark number */}
                    <div className={`absolute -top-4 -right-2 text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-b ${gradients[i]} opacity-[0.06] select-none pointer-events-none leading-none`}>
                      {step.step}
                    </div>

                    {/* Step header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center shadow-lg shadow-[#6d28d9]/20`}>
                        <step.icon className="w-7 h-7 text-white" />
                        {/* Glow effect */}
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradients[i]} opacity-50 blur-md`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${gradients[i]}`}>
                          Step {step.step}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#6d28d9]/40" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D] mb-3">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-[#6F7192] leading-[1.7]">
                      {step.description}
                    </p>

                    {/* Bottom accent line */}
                    <div className={`mt-4 h-0.5 w-12 rounded-full bg-gradient-to-r ${gradients[i]}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center items-center gap-2 mt-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const container = scrollRef.current
                  if (container) {
                    const cardWidth = container.offsetWidth * 0.85
                    container.scrollTo({ left: cardWidth * i, behavior: 'smooth' })
                  }
                }}
                className={`transition-all duration-300 rounded-full ${
                  i === activeIndex
                    ? 'w-8 h-2 bg-gradient-to-r from-[#6d28d9] to-[#a855f7]'
                    : 'w-2 h-2 bg-[#d1d5db] hover:bg-[#9ca3af]'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop: Grid Layout (unchanged) */}
        <div className="hidden md:block relative">
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
          className="text-center mt-8 md:mt-12 lg:mt-16"
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
