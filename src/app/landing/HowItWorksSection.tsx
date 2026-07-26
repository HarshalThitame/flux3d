'use client'

import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { memo, useRef, useState, useEffect, useCallback } from 'react'
import { Upload, MessageSquare, CreditCard, Printer, Package, ArrowRight, ChevronRight } from 'lucide-react'
import { createRafThrottledCallback } from '@/lib/raf-throttle'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const steps = [
  {
    icon: Upload,
    step: '01',
    title: 'Share Your Requirement',
    description: 'Upload a design file or describe the part, product or model you need. We review the request before confirming the order.'
  },
  {
    icon: MessageSquare,
    step: '02',
    title: 'Receive a Quotation',
    description: 'We confirm the material, colour, quantity, finish, shipping and production details, then send the final price or quote.'
  },
  {
    icon: CreditCard,
    step: '03',
    title: 'Pay Securely Online',
    description: 'Payments are handled through the checkout flow with server-side verification before an order is marked paid.'
  },
  {
    icon: Printer,
    step: '04',
    title: 'Production and QC',
    description: 'The order is manufactured, checked, and prepared for dispatch after the final approved specifications are locked in.'
  },
  {
    icon: Package,
    step: '05',
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

function TiltCard({ children, className, isActive, disabled }: { children: React.ReactNode; className?: string; isActive: boolean; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 })
  const opacity = useSpring(isActive ? 1 : 0.55, { stiffness: 300, damping: 30 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || disabled) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    x.set(px)
    y.set(py)
  }, [x, y, disabled])

  const handleMouseLeave = useCallback(() => {
    if (disabled) return
    x.set(0)
    y.set(0)
  }, [x, y, disabled])

  return (
    <motion.div
      ref={ref}
      className={className}
      style={disabled ? undefined : { rotateX, rotateY, opacity, transformPerspective: 800 }}
      onMouseMove={disabled ? undefined : handleMouseMove}
      onMouseLeave={disabled ? undefined : handleMouseLeave}
    >
      {children}
    </motion.div>
  )
}

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const reduceMotion = useReducedMotion()
  const isFinePointer = useMediaQuery('(pointer: fine)')
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { scrollXProgress } = useScroll({ container: scrollRef })
  const progressWidth = useTransform(scrollXProgress, [0, 1], ['0%', '100%'])

  const { scrollYProgress } = useScroll({ target: lineRef, offset: ['start end', 'end start'] })
  const lineProgress = useTransform(scrollYProgress, [0, 0.6], [0, 1])
  const timelineHeight = useTransform(lineProgress, [0, 1], ['0%', '100%'])
  const particleTop0 = useTransform(lineProgress, [0, 1], ['0%', '33%'])
  const particleTop1 = useTransform(lineProgress, [0, 1], ['33%', '66%'])
  const particleTop2 = useTransform(lineProgress, [0, 1], ['66%', '100%'])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const cardWidth = container.offsetWidth * 0.85
      const index = Math.round(scrollLeft / cardWidth)
      setActiveIndex(Math.min(index, steps.length - 1))
    }

    const scheduleScroll = createRafThrottledCallback(handleScroll)
    container.addEventListener('scroll', scheduleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', scheduleScroll)
      scheduleScroll.cancel()
    }
  }, [])

  useEffect(() => {
    if (hoveredIndex !== null) return
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % steps.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [hoveredIndex])

  return (
    <section ref={ref} className="relative py-12 px-6 md:py-16 lg:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(109, 40, 217,0.03)] to-transparent pointer-events-none" />

      {/* Mobile cinematic background glow */}
      <div className="absolute inset-0 md:hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[60%] bg-gradient-to-r from-[#6d28d9]/10 via-[#a855f7]/15 to-[#6d28d9]/10 blur-3xl" />
      </div>

      {/* Desktop: subtle grid pattern */}
      <div className="hidden md:block absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #6d28d9 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={reduceMotion ? { duration: 0.3 } : undefined}
          className="text-center mb-8 md:mb-12 lg:mb-16 relative"
        >
          <span className="premium-section-number">02</span>
          <p className="text-sm font-medium text-[#6d28d9] uppercase tracking-normal mb-4 relative z-10">The Process</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-normal leading-[1.1] relative z-10">
            From Requirement to Dispatch{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6d28d9] to-[#a855f7]">
              in 5 Steps.
            </span>
          </h2>
        </motion.div>

        {/* Mobile: Horizontal Carousel */}
        <div className="md:hidden">
          {/* Progress bar with glow */}
          {!reduceMotion && (
            <div className="mb-6 h-1 bg-[#e5e7eb] rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-[#6d28d9] to-[#a855f7] rounded-full relative"
                style={{ width: progressWidth }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
              </motion.div>
            </div>
          )}

          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-6 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={reduceMotion ? { duration: 0.2 } : { delay: i * 0.08, duration: 0.4 }}
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

        {/* Desktop: Cinematic Alternating Timeline */}
        <div className="hidden md:block relative" ref={lineRef}>
          {/* Animated central timeline */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[rgba(109,40,217,0.15)] to-transparent" />
          {!reduceMotion && (
            <motion.div
              className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-[#6d28d9] via-[#a855f7] to-[#6d28d9]"
              style={{ height: timelineHeight, originY: 0 }}
            />
          )}
          {reduceMotion && (
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-[#6d28d9] via-[#a855f7] to-[#6d28d9]" />
          )}

          {/* Flowing particles along timeline */}
          {!reduceMotion && (
            <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none overflow-hidden">
              {[particleTop0, particleTop1, particleTop2].map((particleTop, i) => (
                <motion.div
                  key={i}
                  className="absolute left-0 w-1.5 h-1.5 rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  style={{
                    top: particleTop,
                    opacity: lineProgress,
                  }}
                />
              ))}
            </div>
          )}

          {/* Step cards */}
          <div className="relative space-y-12 lg:space-y-16">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0
              const isHovered = hoveredIndex === i
              const isDimmed = hoveredIndex !== null && !isHovered

              return (
                <TiltCard
                  key={i}
                  isActive={!isDimmed}
                  disabled={reduceMotion || !isFinePointer}
                  className={`relative flex items-center ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} group`}
                >
                  {/* Card */}
                  <div className={`w-full lg:w-[calc(50%-40px)] ${isLeft ? 'lg:pr-8' : 'lg:pl-8'}`}>
                    <motion.div
                      initial={reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: isLeft ? -40 : 40, y: 20 }}
                      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
                      transition={reduceMotion ? { duration: 0.3 } : { delay: 0.15 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className={`relative overflow-hidden rounded-2xl border border-[rgba(109,40,217,0.1)] bg-white/80 backdrop-blur-xl p-6 lg:p-8 shadow-[0_4px_24px_rgba(109,40,217,0.06)] transition-all duration-500 ${
                        isHovered ? 'border-[rgba(109,40,217,0.25)] shadow-[0_8px_40px_rgba(109,40,217,0.12)]' : ''
                      }`}
                      onHoverStart={() => setHoveredIndex(i)}
                      onHoverEnd={() => setHoveredIndex(null)}
                    >
                      {/* Gradient border glow on hover */}
                      <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-r ${gradients[i]} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[2px] -z-10`} />

                      {/* Watermark step number */}
                      <div className={`absolute -bottom-6 -right-4 text-[140px] font-black text-transparent bg-clip-text bg-gradient-to-t ${gradients[i]} opacity-[0.04] select-none pointer-events-none leading-none`}>
                        {step.step}
                      </div>

                      {/* Icon + step label */}
                      <div className="flex items-center gap-4 mb-5">
                        <motion.div
                          className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center shadow-lg shadow-[#6d28d9]/20`}
                          whileHover={isFinePointer && !reduceMotion ? { scale: 1.1, rotate: 5 } : undefined}
                          transition={isFinePointer && !reduceMotion ? { type: 'spring', stiffness: 400, damping: 10 } : undefined}
                        >
                          <step.icon className="w-8 h-8 text-white relative z-10" />
                          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradients[i]} opacity-40 blur-lg`} />
                        </motion.div>
                        <div>
                          <span className={`text-xs font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${gradients[i]}`}>
                            Step {step.step}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#6d28d9]/30 mt-0.5" />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-[var(--font-syne)] text-xl lg:text-2xl font-bold text-[#0F1B3D] mb-3">
                        {step.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-[#6F7192] leading-[1.7] max-w-md">
                        {step.description}
                      </p>

                      {/* Bottom accent line */}
                      <div className={`mt-5 h-0.5 w-16 rounded-full bg-gradient-to-r ${gradients[i]} transition-all duration-500 group-hover:w-24`} />
                    </motion.div>
                  </div>

                  {/* Center node on timeline */}
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                    <motion.div
                      initial={reduceMotion ? { scale: 1 } : { scale: 0 }}
                      animate={isInView ? { scale: 1 } : {}}
                      transition={reduceMotion ? { duration: 0.2 } : { delay: 0.2 + i * 0.12, type: 'spring', stiffness: 300, damping: 20 }}
                      className={`relative w-12 h-12 rounded-full bg-white border-2 border-[rgba(109,40,217,0.2)] flex items-center justify-center shadow-lg transition-all duration-500 ${
                        isHovered ? 'border-[#6d28d9] shadow-[0_0_24px_rgba(109,40,217,0.3)] scale-110' : ''
                      }`}
                    >
                      <span className={`text-sm font-black text-transparent bg-clip-text bg-gradient-to-r ${gradients[i]}`}>
                        {step.step}
                      </span>
                      {/* Pulse ring on hover */}
                      {isHovered && isFinePointer && !reduceMotion && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-[#6d28d9]"
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  </div>

                  {/* Spacer for other side */}
                  <div className="hidden lg:block w-[calc(50%-40px)]" />
                </TiltCard>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={reduceMotion ? { duration: 0.2 } : { delay: 0.7 }}
          className="text-center mt-8 md:mt-12 lg:mt-16"
        >
          <p className="text-lg text-[#0F1B3D] mb-4">Ready to start?</p>
          <a href="/contact" className="premium-wide-link group">
            Request a Quote
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.16em] text-[#6F7192]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dff5] bg-white px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6d28d9]" />
              Timeline shared before confirmation
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dff5] bg-white px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
              Quality checked before dispatch
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dff5] bg-white px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
              Support via email & phone
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default memo(HowItWorksSection)
