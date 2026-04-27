'use client'

import { CheckCircle2, Clock, Award, Headphones } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Fast Turnaround',
    description: '24-48 hour turnaround for most orders. Express service available for urgent needs.',
    stat: '48hr',
    statLabel: 'Average delivery'
  },
  {
    icon: CheckCircle2,
    title: 'High Precision',
    description: '±0.2mm tolerance on FDM, ±0.05mm on resin. Every part inspected for quality.',
    stat: '±0.05mm',
    statLabel: 'Resin accuracy'
  },
  {
    icon: Award,
    title: 'Industrial Quality',
    description: 'Bambu Lab X1 Carbon printers with AMS. Professional-grade materials and processes.',
    stat: '100%',
    statLabel: 'Quality checked'
  },
  {
    icon: Headphones,
    title: 'Local Pune Support',
    description: 'Based in Pune with dedicated local support. Visit us or connect via WhatsApp.',
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
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">Why Choose Us</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            The Flux-3D <span className="text-[#7a82a0]">Advantage</span>
          </h2>
          <p className="text-[#7a82a0] mt-4 max-w-[500px] mx-auto">
            Combining cutting-edge technology with personalized service to deliver the best 3D printing experience in Pune.
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
              <div className="text-sm text-[#7a82a0]">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-[var(--font-syne)] font-extrabold text-white mb-1">
                4.9<span className="text-[#FF5C1A]">★</span>
              </div>
              <div className="text-sm text-[#7a82a0]">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-[var(--font-syne)] font-extrabold text-white mb-1">
                100<span className="text-[#FF5C1A]">%</span>
              </div>
              <div className="text-sm text-[#7a82a0]">On-time Delivery</div>
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
