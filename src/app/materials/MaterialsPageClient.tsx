'use client'

import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import MaterialsHero from './MaterialsHero'
import ComparisonTable from './ComparisonTable'
import MaterialCards from './MaterialCards'
import MaterialSelectorTool from './MaterialSelectorTool'
import FDMvsResin from './FDMvsResin'
import PostProcessing from './PostProcessing'
import MaterialFAQ from './MaterialFAQ'
import MaterialsCTA from './MaterialsCTA'

const NavbarClient = dynamic(() => import('@/components/NavbarClient'), { ssr: false })

type MaterialProperties = {
  strength?: string
  flexibility?: string
  tempResistance?: string
  difficulty?: string
}

type Material = {
  id: string
  name: string
  type?: string
  pricePerGram?: number
  price_per_gram?: number
  properties?: MaterialProperties
  keyProperties?: string[]
  bestFor?: string[] | string
  difficultyLevel?: string
  heatResistance?: string
  strengthRating?: string
  finishQuality?: string
  recommendedFor?: string
  summary?: string
  icon?: string
  samplePhoto?: string
  density?: number
  stock?: string | boolean
  [key: string]: unknown
}

export default function MaterialsPageClient() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const res = await fetch('/api/materials', { next: { revalidate: 3600 } })
        if (res.ok) {
          const data = await res.json()
          setMaterials(data.materials || data || [])
        }
      } catch (error) {
        console.error('Failed to fetch materials:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMaterials()
  }, [])

  const fallbackMaterials: Material[] = [
    { id: '1', name: 'PLA', pricePerGram: 3, price_per_gram: 3, type: 'FDM', strengthRating: 'Medium', finishQuality: 'Good', heatResistance: 'Low', bestFor: ['Prototypes', 'Models'], properties: { strength: 'Medium', flexibility: 'Low' }, icon: '🧩' },
    { id: '2', name: 'ABS', pricePerGram: 5, price_per_gram: 5, type: 'FDM', strengthRating: 'High', finishQuality: 'Good', heatResistance: 'High', bestFor: ['Functional parts'], properties: { strength: 'High', flexibility: 'Medium' }, icon: '⚙️' },
    { id: '3', name: 'Resin Standard', pricePerGram: 8, price_per_gram: 8, type: 'Resin', strengthRating: 'Medium', finishQuality: 'Excellent', heatResistance: 'Low', bestFor: ['Miniatures', 'Detail parts'], properties: { strength: 'Medium', flexibility: 'Low' }, icon: '💎' },
  ]

  const displayMaterials = materials.length > 0 ? materials : fallbackMaterials

  const displayComparisonMaterials = displayMaterials.map((m) => ({
    name: m.name,
    type: m.type || 'FDM',
    price: Number(m.pricePerGram || m.price_per_gram || 0),
    strength: m.strengthRating === 'High' ? 5 : m.strengthRating === 'Medium' ? 3 : 1,
    flex: m.properties?.flexibility === 'High' ? 5 : m.properties?.flexibility === 'Medium' ? 3 : 1,
    heat: m.heatResistance === 'High' ? 5 : m.heatResistance === 'Medium' ? 3 : 1,
    detail: m.finishQuality === 'Excellent' ? 5 : m.finishQuality === 'Good' ? 3 : 1,
    bestFor: Array.isArray(m.bestFor) ? m.bestFor : (m.bestFor ? [m.bestFor] : ['General printing']),
    difficultyLevel: m.difficultyLevel || 'Easy',
    heatResistance: m.heatResistance || 'Low',
    strengthRating: m.strengthRating || 'Medium',
    finishQuality: m.finishQuality || 'Good',
    stock: m.stock || true,
  }))

  const displayMaterialCardsData = displayMaterials.map((m) => {
    const bestFor = Array.isArray(m.bestFor) ? m.bestFor : (m.bestFor ? [m.bestFor] : [])

    return {
    id: m.id,
    name: m.name,
    icon: m.icon || '🧩',
    description: m.summary || m.recommendedFor || '3D printing material',
    color: m.properties?.strength === 'High' ? 'orange' : 'blue',
    gradient: m.properties?.strength === 'High' ? 'from-[#4c1d95] to-[#a855f7]' : 'from-[#6d28d9] to-[#7c3aed]',
    properties: {
      strength: m.properties?.strength || m.strengthRating || 'Medium',
      flexibility: m.properties?.flexibility || 'Low',
      tempResistance: m.properties?.tempResistance || m.heatResistance || 'Low',
      difficulty: m.properties?.difficulty || m.difficultyLevel || 'Easy',
    },
    useCases: bestFor,
    keyProperties: m.keyProperties || [],
    bestFor,
    difficultyLevel: m.difficultyLevel || 'Easy',
    heatResistance: m.heatResistance || 'Low',
    strengthRating: m.strengthRating || 'Medium',
    finishQuality: m.finishQuality || 'Good',
    samplePhoto: m.samplePhoto || '',
    pricePerGram: Number(m.pricePerGram || m.price_per_gram || 0),
    density: m.density || 1.24,
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] text-[#111827]">
        <NavbarClient transparent user={null} />
        <main className="px-4 py-32 md:px-8 lg:px-16">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-5 h-4 w-40 animate-pulse rounded-full bg-gray-200" />
            <div className="mb-4 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-gray-200" />
            <div className="mb-12 h-5 w-full max-w-2xl animate-pulse rounded-full bg-gray-200" />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-72 animate-pulse rounded-3xl border border-gray-200 bg-white shadow-sm" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FB]" />}>
      <div className="min-h-screen bg-[#F7F8FB] text-[#111827]">
        <NavbarClient transparent user={null} />
        <main>
          <MaterialsHero />
          <ComparisonTable materials={displayComparisonMaterials} />
          <MaterialCards materials={displayMaterialCardsData} />
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
