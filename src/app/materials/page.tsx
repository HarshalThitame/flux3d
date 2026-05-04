import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { absoluteUrl } from '@/lib/site'
import MaterialsHero from './MaterialsHero'
import ComparisonTable from './ComparisonTable'
import MaterialCards from './MaterialCards'
import MaterialSelectorTool from './MaterialSelectorTool'
import FDMvsResin from './FDMvsResin'
import PostProcessing from './PostProcessing'
import MaterialFAQ from './MaterialFAQ'
import MaterialsCTA from './MaterialsCTA'
import { Suspense } from 'react'
import { getPublicMaterialSpecs } from '@/lib/public-materials'

export const metadata: Metadata = {
  title: '3D Printing Materials & Filaments in India | PLA, PETG, ABS, Resin & More — Flux 3D',
  description:
    'Explore 10+ premium 3D printing materials at Flux 3D — PLA+, PETG, ABS, ASA, TPU, Nylon, Silk PLA, Multi-Color, Resin 4K and more. Find the right material for your project. Starting ₹8/g. GST invoice included. Pan-India delivery.',
  keywords: [
    '3D printing materials India',
    'PLA filament India',
    'PETG printing India',
    'ABS 3D printing',
    'resin 3D printing India',
    'TPU flexible printing',
    'Nylon 3D printing',
    'multi-color 3D printing India',
    'best filament for 3D printing India',
    '3D printing material guide',
    'FDM vs resin printing India',
    'engineering grade 3D printing materials',
  ],
  alternates: {
    canonical: '/materials',
  },
  openGraph: {
    title: '3D Printing Materials Guide — Flux 3D | PLA · PETG · ABS · Resin & More',
    description:
      'Not sure which material is right for your project? Flux 3D stocks 10+ premium filaments and resins. Full guide with properties, use cases, and pricing.',
    url: absoluteUrl('/materials'),
    type: 'website',
  },
  twitter: {
    title: '3D Printing Materials Guide — Flux 3D | PLA · PETG · ABS · Resin & More',
    description:
      'Not sure which material is right for your project? Flux 3D stocks 10+ premium filaments and resins. Full guide with properties, use cases, and pricing.',
  },
}

export default async function MaterialsPage() {
  // Fetch materials from API - 100% dynamic from database
  let materials: any[] = []
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/materials`)
    if (res.ok) {
      const data = await res.json()
      materials = data.materials || data || []
    }
  } catch (error) {
    console.error('Failed to fetch materials from API:', error)
  }

  // For ComparisonTable, map to ComparisonMaterial type with new fields
  const comparisonMaterials = materials.map((m: any) => ({
    name: m.name,
    type: m.type || 'FDM',
    price: parseFloat(m.pricePerGram || m.price_per_gram || 0),
    strength: m.strengthRating === 'High' ? 5 : m.strengthRating === 'Medium' ? 3 : 1,
    flex: m.properties?.flexibility === 'High' ? 5 : m.properties?.flexibility === 'Medium' ? 3 : 1,
    heat: m.heatResistance === 'High' ? 5 : m.heatResistance === 'Medium' ? 3 : 1,
    detail: m.finishQuality === 'Excellent' ? 5 : m.finishQuality === 'Good' ? 3 : 1,
    bestFor: m.bestFor?.join(', ') || m.recommendedFor || m.useCases?.join(', ') || 'General printing',
    difficultyLevel: m.difficultyLevel || 'Easy',
    heatResistance: m.heatResistance || 'Low',
    strengthRating: m.strengthRating || 'Medium',
    finishQuality: m.finishQuality || 'Good',
    stock: true,
  }))

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810]" />}>
      <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
        <Navbar transparent />
        <main>
          <MaterialsHero />
          <ComparisonTable materials={comparisonMaterials} />
          <MaterialCards materials={materials} />
          <MaterialSelectorTool />
          <FDMvsResin />
          <PostProcessing />
          <MaterialFAQ />
          <MaterialsCTA />
        </main>
      </div>
    </Suspense>
  )
}
