'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const categories = [
  'All Materials',
  'FDM Filaments',
  'Resin',
  'Flexible',
  'Engineering Grade',
  'Decorative',
  'Medical Grade',
]

interface FilterBarProps {
  onFilterChange: (category: string) => void
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [active, setActive] = useState('All Materials')

  const handleClick = (cat: string) => {
    setActive(cat)
    onFilterChange(cat)
  }

  return (
    <section className="px-4 md:px-8 lg:px-16 pb-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[#6F7192] font-medium">Filter by:</span>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <motion.button
                key={cat}
                onClick={() => handleClick(cat)}
                whileTap={{ scale: 0.96 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active === cat
                    ? 'bg-[#6d28d9] text-white'
                    : 'bg-[rgba(109, 40, 217,0.3)] text-[#6F7192] border border-white/[0.06] hover:border-[rgba(109, 40, 217,0.3)] hover:text-white'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
