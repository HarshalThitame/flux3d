'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import MaterialCard from '@/components/materials/MaterialCard'
import MaterialPopup from '@/components/materials/MaterialPopup'
import { materials, MaterialSpec } from '@/data/materials'

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

export default function MaterialsGrid() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [activeElement, setActiveElement] = useState<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)')
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!activeElement) {
      return
    }

    const updatePosition = () => {
      const rect = activeElement.getBoundingClientRect()
      setAnchorRect({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [activeElement])

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
      setAnchorRect(null)
      setActiveElement(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [activeId, isMobile])

  const activeMaterial = useMemo(
    () => materials.find((material) => material.id === activeId) ?? null,
    [activeId]
  )

  const position = useMemo(() => {
    if (!anchorRect) {
      return null
    }

    return getPopupPosition(anchorRect, isMobile)
  }, [anchorRect, isMobile])

  const closePopup = () => {
    setActiveId(null)
    setAnchorRect(null)
    setActiveElement(null)
  }

  const openMaterial = (material: MaterialSpec, element: HTMLButtonElement) => {
    if (activeId === material.id) {
      closePopup()
      return
    }

    const rect = element.getBoundingClientRect()
    setActiveId(material.id)
    setActiveElement(element)
    setAnchorRect({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    })
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
