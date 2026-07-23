'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import MaterialCard from '@/components/materials/MaterialCard'
import MaterialPopup from '@/components/materials/MaterialPopup'

type MaterialSpec = {
  id: string
  name: string
  tag: string
  icon: string
  description: string
  color?: string
  gradient?: string
  properties: {
    strength: string
    flexibility: string
    tempResistance: string
    difficulty: string
  }
  useCases: string[]
  pros: string[]
  cons: string[]
  settings?: {
    nozzle: string
    bed: string
    speed: string
  }
}

type AnchorRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

type PopupPosition = {
  left: number
  top: number
  width: number
}

type ApiMaterial = {
  id: string
  name: string
  icon?: string
  summary?: string
  colors?: Array<string | { hex?: string }>
  properties?: MaterialSpec['properties']
  recommendedFor?: string
  pricePerGram?: number
  density?: number
}

function getPopupPosition(anchor: AnchorRect, isMobile: boolean): PopupPosition {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const gap = 16

  if (isMobile) {
    const width = Math.min(viewportWidth - 24, 420)

    return {
      width,
      left: Math.max((viewportWidth - width) / 2, 12),
      top: Math.max(viewportHeight - 560, 16),
    }
  }

  const width = Math.min(380, viewportWidth - 32)
  const estimatedHeight = 520
  const roomRight = viewportWidth - anchor.right
  const roomLeft = anchor.left
  const canOpenRight = roomRight >= width + gap
  const canOpenLeft = roomLeft >= width + gap

  let left = anchor.right + gap
  if (!canOpenRight && canOpenLeft) {
    left = anchor.left - width - gap
  } else if (!canOpenRight) {
    left = Math.max(Math.min(anchor.left + anchor.width / 2 - width / 2, viewportWidth - width - 16), 16)
  }

  const roomBelow = viewportHeight - anchor.bottom
  const roomAbove = anchor.top

  let top = anchor.top - 18
  if (roomBelow < estimatedHeight && roomAbove > estimatedHeight) {
    top = anchor.bottom - estimatedHeight + 18
  }

  top = Math.max(Math.min(top, viewportHeight - estimatedHeight - 16), 16)

  return { left, top, width }
}

function mapApiMaterialToSpec(m: ApiMaterial): MaterialSpec {
  const firstColor = m.colors?.[0]

  return {
    id: m.id,
    name: m.name,
    tag: 'Admin Catalog',
    icon: m.icon || '🧩',
    description: m.summary || `${m.name} is available in the live admin catalog for custom 3D printing jobs.`,
    color: typeof firstColor === 'string' ? firstColor : firstColor?.hex,
    properties: m.properties || {
      strength: 'Medium',
      flexibility: 'Medium',
      tempResistance: 'Medium',
      difficulty: 'Medium',
    },
    useCases: m.recommendedFor ? m.recommendedFor.split(',').map((s: string) => s.trim()) : ['Custom printing'],
    pros: [
      `Priced at ₹${m.pricePerGram}/g`,
      `Density ${m.density} g/cm³`,
      'Available in live catalog',
    ],
    cons: [
      'Lead time depends on part geometry',
    ],
    settings: {
      nozzle: '200-230°C',
      bed: '50-80°C',
      speed: '40-100 mm/s',
    },
  }
}

export default function MaterialsGrid() {
  const [materials, setMaterials] = useState<MaterialSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const activeElementRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await fetch('/api/materials')
        const json = await res.json()
        if (json.materials && json.materials.length > 0) {
          setMaterials(json.materials.map(mapApiMaterialToSpec))
        }
      } catch (error) {
        console.error('Failed to load materials:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMaterials()
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)')
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isMobile || !activeId) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) {
        return
      }
      setActiveId(null)
      activeElementRef.current = null
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [activeId, isMobile])

  const activeMaterial = useMemo(
    () => materials.find((material) => material.id === activeId) ?? null,
    [activeId, materials]
  )

  const position = useMemo(() => {
    const el = activeElementRef.current
    if (!el) {
      return null
    }

    const rect = el.getBoundingClientRect()
    const anchor: AnchorRect = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    }
    return getPopupPosition(anchor, isMobile)
  }, [activeId, isMobile])

  const closePopup = () => {
    setActiveId(null)
    activeElementRef.current = null
  }

  const openMaterial = (material: MaterialSpec, element: HTMLButtonElement) => {
    if (activeId === material.id) {
      closePopup()
      return
    }

    activeElementRef.current = element
    setActiveId(material.id)
  }

  if (loading) {
    return (
      <div ref={rootRef} className="relative">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-[24px] bg-white/[0.04] h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (materials.length === 0) {
    return (
      <div ref={rootRef} className="relative text-center py-12">
        <p className="text-[#6F7192]">No materials available at the moment.</p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {materials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            isActive={activeId === material.id}
            onOpen={openMaterial}
            isMobile={isMobile}
          />
        ))}
      </div>

      <MaterialPopup
        material={activeMaterial}
        position={position}
        isMobile={isMobile}
        onClose={closePopup}
      />
    </div>
  )
}
