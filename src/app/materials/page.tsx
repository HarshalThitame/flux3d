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

export default function MaterialsPage() {
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

  // Map materials for ComparisonTable
  const comparisonMaterials = materials.map((m: any) => ({
    name: m.name,
    type: m.type || 'FDM',
    price: parseFloat(m.pricePerGram || m.price_per_gram || 0),
    strength: m.strengthRating === 'High' ? 5 : m.strengthRating === 'Medium' ? 3 : 1,
    flex: m.properties?.flexibility === 'High' ? 5 : m.properties?.flexibility === 'Medium' ? 3 : 1,
    heat: m.heatResistance === 'High' ? 5 : m.heatResistance === 'Medium' ? 3 : 1,
    detail: m.finishQuality === 'Excellent' ? 5 : m.finishQuality === 'Good' ? 3 : 1,
    bestFor: Array.isArray(m.bestFor) ? m.bestFor : (m.bestFor ? [m.bestFor] : (m.recommendedFor ? [m.recommendedFor] : ['General printing'])),
    difficultyLevel: m.difficultyLevel || 'Easy',
    heatResistance: m.heatResistance || 'Low',
    strengthRating: m.strengthRating || 'Medium',
    finishQuality: m.finishQuality || 'Good',
    stock: m.stock || true,
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-[#7a82a0]">Loading materials...</div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810]" />}>
      <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
        <NavbarClient transparent />
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
