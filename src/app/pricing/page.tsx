import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { absoluteUrl } from '@/lib/site'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: '3D Printing Pricing That Feels Clear',
  description:
    'See transparent starting prices for 3D printing, CAD support, and express production, then move into a fast, accurate quote workflow.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Flux3D Pricing',
    description:
      'Transparent pricing guidance for FDM, resin, multi-color printing, CAD support, and express production.',
    url: absoluteUrl('/pricing'),
  },
}

export default async function PricingPage() {
  let materials: { name: string; price_per_gram: number; density: number }[] = []

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('materials')
      .select('name, price_per_gram, density')
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
    <div>
      <Navbar transparent />
      <PricingClient materials={materials} />
    </div>
  )
}
