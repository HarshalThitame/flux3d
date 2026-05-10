'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Gauge, Layers, Box, Palette, Printer, Eye } from 'lucide-react'

const specs = [
  {
    icon: Gauge,
    label: 'Max Print Speed',
    value: '500 mm/s',
    note: '10× faster than standard printers',
    color: 'from-[#7C5CFF] to-[#A78BFA]'
  },
  {
    icon: Layers,
    label: 'Layer Resolution',
    value: '0.05mm',
    note: 'Near-invisible layer lines',
    color: 'from-[#A78BFA] to-[#A78BFA]'
  },
  {
    icon: Box,
    label: 'Build Volume',
    value: '256³mm',
    note: 'Large format single-piece prints',
    color: 'from-[#7C5CFF] to-[#7C5CFF]'
  },
  {
    icon: Palette,
    label: 'Multi-Color',
    value: '4-Color AMS',
    note: 'Automatic material switching',
    color: 'from-[#A78BFA] to-[#A78BFA]'
  },
  {
    icon: Printer,
    label: 'Resin Resolution',
    value: '4K · 0.05mm',
    note: 'Elegoo Saturn 4 fleet',
    color: 'from-[#EC4899] to-[#f472b6]'
  },
  {
    icon: Eye,
    label: 'AI Monitoring',
    value: 'Built-in Camera',
    note: 'Auto-detects print failures',
    color: 'from-[#8B5CF6] to-[#a78bfa]'
  }
]

export default function TechnologySection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(124, 92, 255,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-[#7C5CFF] uppercase tracking-[3px] mb-4">Our Equipment</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            Printed on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA] animate-gradient">
              Bambu Lab P2S.
            </span>
            <br />
            <span className="text-[#6F7192]">India&apos;s Fastest.</span>
          </h2>
          <p className="text-[#6F7192] mt-4 max-w-[700px] mx-auto leading-[1.7]">
            We don&apos;t print on hobbyist machines. Our entire FDM fleet runs on Bambu Lab X1 Carbon — the world&apos;s fastest professional desktop 3D printer. Every part benefits from automatic calibration, multi-color AMS capability, and AI-powered quality monitoring.
          </p>
        </motion.div>

        {/* Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specs.map((spec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group relative bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-2xl p-8 overflow-hidden hover:border-[rgba(124, 92, 255,0.3)] transition-colors"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${spec.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${spec.color} scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500`} />

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${spec.color} p-0.5 mb-6`}>
                  <div className="w-full h-full rounded-xl bg-[#FFFFFF] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <spec.icon className="w-7 h-7 text-[#0F1B3D]" />
                  </div>
                </div>

                <p className="text-xs text-[#6F7192] uppercase tracking-wider mb-1">{spec.label}</p>
                <p className="font-[var(--font-syne)] text-2xl font-extrabold text-[#0F1B3D] mb-2">{spec.value}</p>
                <p className="text-sm text-[#6F7192]">{spec.note}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          className="text-center text-sm text-[#6F7192] mt-12"
        >
          All prints are photographed and quality checked before they leave our facility.
        </motion.p>
      </div>
    </section>
  )
}
