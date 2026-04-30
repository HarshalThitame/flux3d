'use client'

import { motion } from 'framer-motion'

const marqueeItems = [
  'IIT Bombay Students', 'Manufacturing Units', 'Dental Clinics', 'Architecture Firms',
  'YouTubers & Creators', 'Corporate HR Teams', 'Robotics Clubs', 'Interior Designers',
  'Medical Colleges', 'Gaming Enthusiasts', 'Pune Startups', 'Bangalore Engineers'
]

export default function MarqueeSection() {
  return (
    <div className="relative w-full overflow-hidden bg-[#050810] border-y border-[rgba(255,255,255,0.05)] py-4">
      <div className="flex items-center gap-2 px-6 mb-2">
        <span className="text-xs text-[#4a5070] uppercase tracking-wider">Trusted by</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
      </div>
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <div key={i} className="mx-6 text-sm text-[#7a82a0] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C1A]" />
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
