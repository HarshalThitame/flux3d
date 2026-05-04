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

type Material = {
  id: string
  name: string
  type?: string
  pricePerGram?: number
  price_per_gram?: number
  properties?: any
  keyProperties?: string[]
  bestFor?: string[]
  difficultyLevel?: string
  heatResistance?: string
  strengthRating?: string
  finishQuality?: string
  recommendedFor?: string
  stock?: string | boolean
  [key: string]: any
}

export default function MaterialsPageClient() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const res = await fetch('/api/materials')
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

  // Fallback materials if fetch fails
  const fallbackMaterials: Material[] = [
    { id: '1', name: 'PLA', pricePerGram: 3, price_per_gram: 3, type: 'FDM', strengthRating: 'Medium', finishQuality: 'Good', heatResistance: 'Low', bestFor: ['Prototypes', 'Models'], properties: { strength: 'Medium', flexibility: 'Low' }, icon: '🧩' },
    { id: '2', name: 'ABS', pricePerGram: 5, price_per_gram: 5, type: 'FDM', strengthRating: 'High', finishQuality: 'Good', heatResistance: 'High', bestFor: ['Functional parts'], properties: { strength: 'High', flexibility: 'Medium' }, icon: '⚙️' },
    { id: '3', name: 'Resin Standard', pricePerGram: 8, price_per_gram: 8, type: 'Resin', strengthRating: 'Medium', finishQuality: 'Excellent', heatResistance: 'Low', bestFor: ['Miniatures', 'Detail parts'], properties: { strength: 'Medium', flexibility: 'Low' }, icon: '💎' },
  ]

  const displayMaterials = materials.length > 0 ? materials : fallbackMaterials

  // Map display materials for ComparisonTable
  const displayComparisonMaterials = displayMaterials.map((m: any) => ({
    name: m.name,
    type: m.type || 'FDM',
    price: parseFloat(m.pricePerGram || m.price_per_gram || 0),
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

  // Map display materials for MaterialCards
  const displayMaterialCardsData = displayMaterials.map((m: any) => ({
    id: m.id,
    name: m.name,
    icon: m.icon || '🧩',
    description: m.summary || m.recommendedFor || '3D printing material',
    color: m.properties?.strength === 'High' ? 'orange' : 'blue',
    gradient: m.properties?.strength === 'High' ? 'from-orange-500 to-red-500' : 'from-blue-500 to-purple-500',
    properties: {
      strength: m.properties?.strength || m.strengthRating || 'Medium',
      flexibility: m.properties?.flexibility || 'Low',
      tempResistance: m.properties?.tempResistance || m.heatResistance || 'Low',
      difficulty: m.properties?.difficulty || m.difficultyLevel || 'Easy',
    },
    useCases: Array.isArray(m.bestFor) ? m.bestFor : (m.bestFor ? [m.bestFor] : []),
    keyProperties: m.keyProperties || [],
    bestFor: m.bestFor || [],
    difficultyLevel: m.difficultyLevel || 'Easy',
    heatResistance: m.heatResistance || 'Low',
    strengthRating: m.strengthRating || 'Medium',
    finishQuality: m.finishQuality || 'Good',
    samplePhoto: m.samplePhoto || '',
    pricePerGram: parseFloat(m.pricePerGram || m.price_per_gram || 0),
    density: m.density || 1.24,
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
        <NavbarClient transparent user={null} />
        <main className="px-6 py-32">
          <div className="mx-auto max-w-[1200px]">
            <div className="h-8 w-48 bg-[#0d1120] rounded animate-pulse mb-6" />
            <div className="h-12 w-96 bg-[#0d1120] rounded animate-pulse mb-12" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-64 bg-[#0d1120] rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810]" />}>
      <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
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
