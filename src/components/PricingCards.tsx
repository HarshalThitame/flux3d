'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

type MaterialPricing = {
  name: string
  price_per_gram: number
  density: number
}

type PricingCardsProps = {
  materials: MaterialPricing[]
}

const fallbackCards = [
  { title: 'FDM Printing', price: 'From ₹99', desc: 'Reliable functional parts, prototypes, and utility builds with a strong balance of speed and cost.', color: 'from-emerald-400', href: '/materials' },
  { title: 'Resin Printing', price: 'From ₹199', desc: 'Fine-detail prints, casting masters, and polished display pieces where finish matters most.', color: 'from-blue-400', href: '/materials' },
  { title: 'Multi-Color Prints', price: 'From ₹249', desc: 'AMS-based color separation for logos, branded models, and presentation-ready parts.', color: 'from-purple-400', href: '/materials' },
  { title: '3D Modeling', price: 'From ₹499', desc: 'Custom CAD support from sketches, references, or rough concepts when the file does not exist yet.', color: 'from-orange-400', href: '/services' },
]

export default function PricingCards({ materials }: PricingCardsProps) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Use real data if available, otherwise fallback
  const displayCards = (materials && materials.length > 0)
    ? materials.map((m) => ({
        title: m.name,
        price: `From ₹${m.price_per_gram || 0}/g`,
        desc: m.density ? `Density: ${m.density}g/cm³ · Transparent per-gram pricing` : 'Transparent per-gram pricing',
        color: 'from-[#7C5CFF]',
        href: `/materials?name=${encodeURIComponent(m.name)}`,
      }))
    : fallbackCards

  if (loading) {
    return (
      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-48 w-full" />
        <SkeletonBlock className="h-48 w-full" />
        <SkeletonBlock className="h-48 w-full" />
        <SkeletonBlock className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {displayCards.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="group rounded-[28px] border border-[rgba(124, 92, 255,0.5)] bg-[#FFFFFF] p-7 transition-all hover:border-[#7C5CFF]/30 hover:bg-[#FFFFFF]/80"
        >
          <div className={`text-[11px] uppercase tracking-[0.22em] bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
            Starting From
          </div>
          <h2 className="mt-4 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] group-hover:text-[#7C5CFF] transition-colors">{item.title}</h2>
          <div className="mt-4 text-lg font-semibold text-[#7C5CFF]">{item.price}</div>
          <p className="mt-3 text-sm leading-7 text-[#6F7192]">{item.desc}</p>
          <div className="mt-4 text-xs text-[#7C5CFF] opacity-0 transition-opacity group-hover:opacity-100">
            Click to explore →
          </div>
        </Link>
      ))}
    </div>
  )
}
