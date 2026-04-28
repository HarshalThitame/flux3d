'use client'

import { CheckCircle2, Clock, Award, Headphones } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Fast Turnaround',
    description: 'Most orders move in 3-5 working days, and urgent builds can be prioritized when timing matters.',
    stat: '3-5d',
    statLabel: 'Average turnaround'
  },
  {
    icon: CheckCircle2,
    title: 'High Precision',
    description: 'We do not just press print and walk away. Every part is checked for finish, fit, and production confidence.',
    stat: '±0.05mm',
    statLabel: 'Resin accuracy'
  },
  {
    icon: Award,
    title: 'Industrial Quality',
    description: 'Professional-grade machines, trusted materials, and a workflow built around repeatable, true-to-spec results.',
    stat: '100%',
    statLabel: 'Quality checked'
  },
  {
    icon: Headphones,
    title: 'Direct Support',
    description: 'You are not talking to a call centre. You are speaking directly with the people planning and printing your part.',
    stat: '24hr',
    statLabel: 'Response time'
  }
]

export default function WhyChooseUs() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">Why Clients Come Back</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            The Difference You Can <span className="text-[#7a82a0]">Feel</span>
          </h2>
          <p className="text-[#7a82a0] mt-4 max-w-[500px] mx-auto">
            Speed, refined quality, honest pricing, and practical material guidance for teams that need more than a basic print shop.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 text-center group hover:border-[#FF5C1A] transition-colors"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-[rgba(255,92,26,0.08)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <benefit.icon className="w-7 h-7 text-[#FF5C1A]" />
              </div>

              {/* Title */}
              <h3 className="font-[var(--font-syne)] text-lg font-bold text-white mb-2">
                {benefit.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-[#7a82a0] leading-[1.6] mb-4">
                {benefit.description}
              </p>

              {/* Stat */}
              <div className="bg-[rgba(255,92,26,0.08)] rounded-lg p-3">
                <div className="font-[var(--font-syne)] text-2xl font-extrabold text-[#FF5C1A]">
                  {benefit.stat}
                </div>
                <div className="text-xs text-[#7a82a0] mt-1">
                  {benefit.statLabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-[var(--font-syne)] font-extrabold text-white mb-1">
                500<span className="text-[#FF5C1A]">+</span>
              </div>
              <div className="text-sm text-[#7a82a0]">Parts Printed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-[var(--font-syne)] font-extrabold text-white mb-1">
                18<span className="text-[#FF5C1A]">μm</span>
              </div>
              <div className="text-sm text-[#7a82a0]">Fine resin detail</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-[var(--font-syne)] font-extrabold text-white mb-1">
                100<span className="text-[#FF5C1A]">%</span>
              </div>
              <div className="text-sm text-[#7a82a0]">Quality-checked workflow</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-[var(--font-syne)] font-extrabold text-white mb-1">
                10<span className="text-[#FF5C1A]">+</span>
              </div>
              <div className="text-sm text-[#7a82a0]">Materials Available</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
