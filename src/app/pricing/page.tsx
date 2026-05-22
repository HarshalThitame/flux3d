import type { Metadata } from 'next'

export const dynamic = 'force-static'

import Navbar from '@/components/Navbar'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: {
    absolute: '3D Printing Pricing — Transparent Costs Starting ₹99 | Flux3D',
  },
  description:
    'Simple, transparent 3D printing pricing. Upload your model and get an instant quote. Starting ₹99. No hidden charges. Pan-India delivery included.',
  alternates: {
    canonical: '/pricing',
  },
}

export default async function PricingPage() {
  let materials: { name: string; price_per_gram: number; density: number }[] = []

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('materials')
      .select('name, price_per_gram, density')
      .returns<{ name: string; price_per_gram: number; density: number }[]>()
      .order('price_per_gram', { ascending: true })

    if (!error && data) {
      materials = data
    }
  } catch {
    // Silently fail - will use fallback
  }

  // Static fallback if no materials fetched
  if (materials.length === 0) {
    materials = [
      { name: 'PLA', price_per_gram: 3, density: 1.24 },
      { name: 'ABS', price_per_gram: 5, density: 1.04 },
      { name: 'Resin Standard', price_per_gram: 8, density: 1.1 },
      { name: 'Multi-Color PLA', price_per_gram: 6, density: 1.24 },
    ]
  }

  return (
    <div className="pricing-premium-shell min-h-screen overflow-hidden bg-[#05060A] text-white">
      <Navbar transparent />
      <PricingClient materials={materials} />
    </div>
  )
}
