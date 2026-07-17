'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Printer, Camera, Shield, Zap, MessageCircle, Truck, RefreshCw } from 'lucide-react'
import { staggerContainer, cardItem, fadeUp, viewportOnce, viewportHeader } from '@/lib/animation-variants'

const trustPoints = [
  { icon: Printer, title: 'Bambu Lab P2S Fleet', body: 'We run India\'s most advanced consumer-grade professional 3D printers. Automatic calibration, AI monitoring, multi-color AMS.' },
  { icon: Camera, title: 'Photo Update Before Dispatch', body: 'Every order is photographed after printing and before packing. You see your part before it leaves our facility.' },
  { icon: Shield, title: 'NDA for Sensitive Projects', body: 'Industrial and medical clients can request a Non-Disclosure Agreement before sharing design files. Your IP stays yours.' },
  { icon: Zap, title: 'Express 24hr Available', body: 'For urgent requirements, we offer 24-hour express printing and dispatch in Mumbai and Pune. Weekends included.' },
  { icon: MessageCircle, title: 'Real Humans on WhatsApp', body: 'No chatbots. No ticket queues. Our team responds on WhatsApp within 30 minutes during business hours.' },
  { icon: Truck, title: 'Tracked Pan-India Shipping', body: 'Every shipment is dispatched with a tracking ID via Delhivery or Shiprocket. We deliver to 19,000+ pin codes.' },
  { icon: RefreshCw, title: 'Reprint Guarantee', body: 'If your print has a defect due to our error, we reprint it — no questions, no extra charge, no drama.' },
]

export default function TrustSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, viewportHeader)

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_30%_50%,rgba(16,185,129,0.04)_0%,transparent_70%)] pointer-events-none" />
      <div className="max-w-[1200px] mx-auto relative z-10">
        <motion.div variants={fadeUp} initial="hidden" animate={isInView ? "show" : "hidden"} className="text-center mb-16">
          <p className="text-sm font-medium text-[#6d28d9] uppercase tracking-normal mb-4">Why Trust Us</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-normal leading-[1.1]">
            Quality You Can{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6d28d9] to-[#6d28d9]">
              See and Touch.
            </span>
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {trustPoints.map((point, i) => (
            <motion.div
              key={i}
              variants={cardItem}
              className="group bg-[#faf9f7] border border-[rgba(109,40,217,0.5)] rounded-2xl p-6 hover:border-[rgba(109,40,217,0.2)] hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-[rgba(109,40,217,0.08)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <point.icon className="w-6 h-6 text-[#6d28d9]" />
              </div>
              <h3 className="font-[var(--font-syne)] text-base font-bold text-[#0F1B3D] mb-2 group-hover:text-[#6d28d9] transition-colors">
                {point.title}
              </h3>
              <p className="text-sm text-[#6F7192] leading-[1.6]">{point.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
