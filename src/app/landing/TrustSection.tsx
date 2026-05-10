'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Printer, Camera, FileText, Shield, Zap, MessageCircle, Truck, RefreshCw } from 'lucide-react'

const trustPoints = [
  {
    icon: Printer,
    title: 'Bambu Lab P2S Fleet',
    body: 'We run India\'s most advanced consumer-grade professional 3D printers. Automatic calibration, AI monitoring, multi-color AMS.'
  },
  {
    icon: Camera,
    title: 'Photo Update Before Dispatch',
    body: 'Every order is photographed after printing and before packing. You see your part before it leaves our facility.'
  },
  {
    icon: Shield,
    title: 'NDA for Sensitive Projects',
    body: 'Industrial and medical clients can request a Non-Disclosure Agreement before sharing design files. Your IP stays yours.'
  },
  {
    icon: Zap,
    title: 'Express 24hr Available',
    body: 'For urgent requirements, we offer 24-hour express printing and dispatch in Mumbai and Pune. Weekends included.'
  },
  {
    icon: MessageCircle,
    title: 'Real Humans on WhatsApp',
    body: 'No chatbots. No ticket queues. Our team responds on WhatsApp within 30 minutes during business hours.'
  },
  {
    icon: Truck,
    title: 'Tracked Pan-India Shipping',
    body: 'Every shipment is dispatched with a tracking ID via Delhivery or Shiprocket. We deliver to 19,000+ pin codes.'
  },
  {
    icon: RefreshCw,
    title: 'Reprint Guarantee',
    body: 'If your print has a defect due to our error, we reprint it — no questions, no extra charge, no drama.'
  }
]

export default function TrustSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_30%_50%,rgba(16,185,129,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#7C5CFF] uppercase tracking-[3px] mb-4">Why Trust Us</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            Quality You Can{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#7C5CFF]">
              See and Touch.
            </span>
          </h2>
        </motion.div>

        {/* Trust grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-2xl p-6 hover:border-[rgba(124, 92, 255,0.2)] transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-[rgba(124, 92, 255,0.08)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <point.icon className="w-6 h-6 text-[#7C5CFF]" />
              </div>
              <h3 className="font-[var(--font-syne)] text-base font-bold text-[#0F1B3D] mb-2 group-hover:text-[#7C5CFF] transition-colors">
                {point.title}
              </h3>
              <p className="text-sm text-[#6F7192] leading-[1.6]">{point.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
