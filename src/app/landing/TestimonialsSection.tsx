'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Star } from 'lucide-react'
import { staggerContainer, cardItem, fadeUp, viewportOnce, viewportHeader } from '@/lib/animation-variants'

const testimonials = [
  { stars: 5, quote: 'I needed a replacement bracket for our CNC machine urgently. The original was discontinued and importing would have taken 3 weeks. Flux 3D delivered a perfect PETG part in 36 hours. Saved us an entire production day.', name: 'Rajesh Patil', title: 'Production Manager', company: 'Patil Engineering, Nashik', tag: 'Industrial Parts' },
  { stars: 5, quote: 'My B.Arch jury model came out absolutely stunning. The detail on the facade was incredible and it was ready 2 days before submission. My jury panel literally picked it up to look at it closely.', name: 'Aanya Sharma', title: 'B.Arch Student', company: 'CEPT University, Ahmedabad', tag: 'Architecture Model' },
  { stars: 5, quote: 'We ordered 200 custom logo desk pieces for our Diwali corporate gifting. The quality was exceptional, delivery was coordinated to 12 different offices, and the invoice was ready instantly.', name: 'Priya Desai', title: 'HR Manager', company: 'FinTech startup, Mumbai', tag: 'Corporate Gifting' },
  { stars: 5, quote: 'As a dental clinic, precision is non-negotiable. The jaw arch models we get from Flux 3D are indistinguishable from lab-made ones, at a fraction of the cost and delivered the next day.', name: 'Dr. Sameer Joshi', title: 'Orthodontist', company: 'Joshi Dental Clinic, Pune', tag: 'Dental Models' },
  { stars: 5, quote: 'I\'m a full-time creator and my setup is literally my brand. Flux 3D built me a custom controller stand, cable management system, and a branded mic flag. My last setup reel crossed 2 million views.', name: 'Kartik Menon', title: 'Tech YouTuber', company: '680K subscribers', tag: 'Creator Props' },
  { stars: 5, quote: 'Our robotics team needed 40 identical motor mounts for our competition bot in 5 days. Flux 3D nailed the dimensions, delivered on time, and even caught a design flaw we missed.', name: 'Vikram Iyer', title: 'Team Lead', company: 'VJTI Robotics Club, Mumbai', tag: 'Student Project' },
]

const colors = [
  'from-[#6d28d9] to-[#a855f7]',
  'from-[#a855f7] to-[#a855f7]',
  'from-[#6d28d9] to-[#6d28d9]',
  'from-[#fb7185] to-[#6d28d9]',
  'from-[#a855f7] to-[#6d28d9]',
  'from-[#0f766e] to-[#14b8a6]'
]

export default function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, viewportHeader)

  return (
    <section ref={ref} className="relative py-12 px-6 md:py-16 lg:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(91,33,182,0.04)] to-transparent pointer-events-none" />
      <div className="max-w-[1200px] mx-auto relative z-10">
        <motion.div variants={fadeUp} initial="hidden" animate={isInView ? "show" : "hidden"} className="text-center mb-8 md:mb-12 lg:mb-16">
          <p className="text-sm font-medium text-[#5b21b6] uppercase tracking-normal mb-4">What Our Customers Say</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#4c1d95] tracking-normal leading-[1.1]">
            500+ Customers.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5b21b6] to-[#a855f7]">
              Zero Compromises.
            </span>
          </h2>
          <p className="text-[#5b21b6] mt-4 max-w-[600px] mx-auto">
            From hostel rooms in Pune to factories in Nashik — here&apos;s what real customers have to say.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 lg:mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              variants={cardItem}
              className="bg-[#faf9f7] border border-[rgba(91,33,182,0.10)] rounded-2xl p-8 hover:border-[rgba(91,33,182,0.18)] hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`inline-flex items-center bg-gradient-to-r ${colors[i]} text-[#4c1d95] text-xs font-semibold px-3 py-1 rounded-full mb-4`}>
                {t.tag}
              </div>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#5b21b6] text-[#5b21b6]" />
                ))}
              </div>
              <p className="text-sm text-[#5b21b6] leading-[1.7] mb-6 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-[rgba(91,33,182,0.10)]">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[i]} flex items-center justify-center text-[#4c1d95] font-bold text-sm`}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#4c1d95]">{t.name}</p>
                  <p className="text-xs text-[#5b21b6]">{t.title} · {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewportOnce} className="bg-[#faf9f7] border border-[rgba(91,33,182,0.12)] rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-5 h-5 fill-[#5b21b6] text-[#5b21b6]" />
                <span className="font-[var(--font-syne)] text-2xl font-extrabold text-[#4c1d95]">4.9</span>
                <span className="text-[#5b21b6] text-sm">/ 5</span>
              </div>
              <p className="text-xs text-[#5b21b6]">Average Rating</p>
            </div>
            <div>
              <div className="font-[var(--font-syne)] text-2xl font-extrabold text-[#4c1d95]">500+</div>
              <p className="text-xs text-[#5b21b6]">Total Reviews</p>
            </div>
            <div>
              <div className="font-[var(--font-syne)] text-2xl font-extrabold text-[#4c1d95]">Google · IG · WA</div>
              <p className="text-xs text-[#5b21b6]">Platforms</p>
            </div>
            <div>
              <div className="font-[var(--font-syne)] text-2xl font-extrabold text-[#5b21b6]">100%</div>
              <p className="text-xs text-[#5b21b6]">Verified Buyers</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
