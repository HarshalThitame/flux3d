'use client'

import { motion, useInView, useAnimationControls } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Clock, Target, Award, MessageCircle } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Fast Turnaround',
    description: 'Most orders move in 3 working days. Urgent builds can be prioritized when timing matters.',
    stat: 3,
    statLabel: 'Days avg. turnaround',
    statUnit: 'd',
    color: 'from-[#7C5CFF] to-[#A78BFA]'
  },
  {
    icon: Target,
    title: 'High Precision',
    description: 'Every part is checked for finish, fit, and production confidence. We do not just press print and walk away.',
    stat: 0.1,
    statLabel: 'Resin accuracy',
    statUnit: 'mm',
    statPrefix: '±',
    color: 'from-[#A78BFA] to-[#A78BFA]'
  },
  {
    icon: Award,
    title: 'Industrial Quality',
    description: 'Professional-grade machines, trusted materials, and a workflow built around repeatable, true-to-spec results.',
    stat: 100,
    statLabel: 'Quality checked',
    statUnit: '%',
    color: 'from-[#7C5CFF] to-[#7C5CFF]'
  },
  {
    icon: MessageCircle,
    title: 'Direct Support',
    description: 'You are speaking directly with the people planning and printing your part. No call centres, no runaround.',
    stat: 1,
    statLabel: 'Hour response time',
    statUnit: 'hr',
    color: 'from-[#8B5CF6] to-[#a78bfa]'
  }
]

function AnimatedCounter({ target, unit, prefix = '', suffix = '', duration = 2 }: { target: number; unit: string; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(eased * target)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [isInView, target, duration])

  const displayValue = Number.isInteger(target) ? Math.round(count) : count.toFixed(2)

  return (
    <span ref={ref}>
      {prefix}{displayValue}{unit ? <span className="text-[#7C5CFF]">{unit}</span> : ''}{suffix}
    </span>
  )
}

function BenefitCard({ benefit, index }: { benefit: typeof benefits[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-2xl p-8 overflow-hidden hover:border-[rgba(124, 92, 255,0.3)] transition-colors"
    >
      {/* Background gradient on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${benefit.color} scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500`} />

      <div className="relative z-10">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} p-0.5 mb-6`}>
          <div className="w-full h-full rounded-xl bg-[#FFFFFF] flex items-center justify-center group-hover:scale-110 transition-transform">
            <benefit.icon className="w-7 h-7 text-[#0F1B3D]" />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D] mb-2 group-hover:text-[#7C5CFF] transition-colors">
          {benefit.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[#6F7192] leading-[1.6] mb-6">
          {benefit.description}
        </p>

        {/* Stat */}
        <div className="bg-[rgba(124, 92, 255,0.25)] rounded-xl p-4 text-center border border-[rgba(124, 92, 255,0.4)]">
          <div className="font-[var(--font-syne)] text-3xl font-extrabold text-[#0F1B3D]">
            <AnimatedCounter
              target={benefit.stat}
              unit={benefit.statUnit}
              prefix={benefit.statPrefix || ''}
            />
          </div>
          <div className="text-xs text-[#6F7192] mt-1">{benefit.statLabel}</div>
        </div>
      </div>
    </motion.div>
  )
}

const trustStats = [
  { value: 500, unit: '+', label: 'Parts Delivered' },
  { value: 50, unit: 'μm', label: 'Fine resin detail' },
  { value: 100, unit: '%', label: 'Quality checked' },
  { value: 10, unit: '+', label: 'Materials' }
]

function TrustStat({ stat, index }: { stat: typeof trustStats[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ delay: index * 0.1 }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-[var(--font-syne)] font-extrabold text-[#0F1B3D] mb-1">
        <AnimatedCounter target={stat.value} unit={stat.unit} />
      </div>
      <div className="text-sm text-[#6F7192]">{stat.label}</div>
    </motion.div>
  )
}

export default function WhyChooseUs() {
  return (
    <section className="py-24 px-6 relative">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_70%_50%,rgba(80,100,255,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#7C5CFF] uppercase tracking-[3px] mb-4">Why Clients Come Back</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            The Difference You Can{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
              Feel
            </span>
          </h2>
          <p className="text-[#6F7192] mt-4 max-w-[500px] mx-auto">
            Speed, refined quality, honest pricing, and practical material guidance for teams that need more than a basic print shop.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, i) => (
            <BenefitCard key={i} benefit={benefit} index={i} />
          ))}
        </div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-2xl p-8 md:p-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustStats.map((stat, i) => (
              <TrustStat key={i} stat={stat} index={i} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
