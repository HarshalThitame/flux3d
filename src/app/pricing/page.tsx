import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import PricingCTA from '@/app/services/PricingCTA'
import { absoluteUrl } from '@/lib/site'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PricingCards from '@/components/PricingCards'

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

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <main className="pt-32">
        <section className="px-6 md:px-12">
          <div className="mx-auto max-w-[1200px]">
            <p className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]">Pricing</p>
            <h1 className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-white">
              Clear Pricing for <span className="text-[#7a82a0]">Serious 3D Printing Work</span>
            </h1>
            <p className="mt-6 max-w-[700px] text-base leading-8 text-[#7a82a0]">
              Your final quote is shaped by material, geometry, print time, finishing, and quantity. The goal here is simple: make the starting point obvious and the next step effortless.
            </p>

            <PricingCards materials={materials} />
          </div>
        </section>

        <PricingCTA />
      </main>
    </div>
  )
}
