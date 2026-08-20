'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ShopPublicCategory } from '@/lib/shop/public-types'

export default function CategoryFilterDropdown({
  categories,
  value,
  onChange,
  onOpenChange,
  placeholder = 'All Categories',
}: {
  categories: ShopPublicCategory[]
  value: string
  onChange: (slug: string) => void
  onOpenChange?: (open: boolean) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
        onOpenChange?.(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        onOpenChange?.(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const selected = value === 'all' ? null : categories.find((category) => category.slug === value)

  function toggle(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div ref={ref} className="hero-filter" data-open={open}>
      <button
        type="button"
        className="hero-filter-trigger"
        onClick={() => toggle(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected ? `${selected.icon_emoji ?? ''} ${selected.name}` : placeholder}</span>
        <ChevronDown className="hero-filter-chevron h-4 w-4" />
      </button>
      {open && (
        <div className="hero-filter-list scrollbar-hide" role="listbox" aria-label="Filter by category">
          <button type="button" className="hero-filter-item" data-active={value === 'all'} onClick={() => { onChange('all'); setOpen(false); onOpenChange?.(false) }}>
            {placeholder}
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className="hero-filter-item"
              data-active={value === category.slug}
              onClick={() => { onChange(category.slug); setOpen(false); onOpenChange?.(false) }}
            >
              {category.icon_emoji && (
                <span aria-hidden="true">{category.icon_emoji}</span>
              )}
              {category.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}