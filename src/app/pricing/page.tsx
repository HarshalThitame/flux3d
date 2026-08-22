import type { Metadata } from 'next'

import Navbar from '@/components/Navbar'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PricingClientBoundary from './PricingClientBoundary'

export const metadata: Metadata = {
  title: {
    absolute: '3D Printing Pricing and Quotes | Flux3D',
  },
  description:
    'Flux3D shows public pricing where available and explains how custom 3D printing quotes are calculated.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: '3D Printing Pricing and Quotes',
    description: 'Flux3D shows public pricing where available and explains how custom 3D printing quotes are calculated.',
    url: 'https://flux3d.in/pricing',
    type: 'website',
  },
  twitter: {
    title: '3D Printing Pricing and Quotes',
    description: 'Flux3D shows public pricing where available and explains how custom 3D printing quotes are calculated.',
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

  return (
    <div className="pricing-premium-shell min-h-screen overflow-hidden">
      <Navbar transparent />
      <PricingClientBoundary materials={materials} />
    </div>
  )
}
