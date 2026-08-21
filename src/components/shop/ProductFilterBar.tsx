'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ShopPublicCategory, ShopPublicProduct } from '@/lib/shop/public-types'
import { formatShopPrice } from '@/lib/shop/selection'

type SortOption = 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'rating'

interface ProductFilterBarProps {
  products: ShopPublicProduct[]
  categories: ShopPublicCategory[]
  onFilteredChange: (products: ShopPublicProduct[]) => void
  className?: string
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
]

const PRICE_RANGES = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 – ₹2,000', min: 1000, max: 2000 },
  { label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { label: '₹5,000+', min: 5000, max: Infinity },
]

export default function ProductFilterBar({
  products,
  categories,
  onFilteredChange,
  className = '',
}: ProductFilterBarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [sort, setSort] = useState<SortOption>('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const activeFilters = useMemo(() => {
    const filters: { label: string; onRemove: () => void }[] = []
    if (selectedCategory !== 'all') {
      const cat = categories.find((c) => c.slug === selectedCategory)
      if (cat) filters.push({ label: cat.name, onRemove: () => setSelectedCategory('all') })
    }
    if (selectedPrice !== null) {
      filters.push({ label: PRICE_RANGES[selectedPrice].label, onRemove: () => setSelectedPrice(null) })
    }
    if (inStockOnly) {
      filters.push({ label: 'In Stock', onRemove: () => setInStockOnly(false) })
    }
    return filters
  }, [selectedCategory, selectedPrice, inStockOnly, categories])

  const filtered = useMemo(() => {
    let result = [...products]

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category_slug === selectedCategory)
    }

    if (selectedPrice !== null) {
      const range = PRICE_RANGES[selectedPrice]
      result = result.filter((p) => p.display_price >= range.min && p.display_price <= range.max)
    }

    if (inStockOnly) {
      result = result.filter((p) => p.in_stock)
    }

    switch (sort) {
      case 'price_asc':
        result.sort((a, b) => a.display_price - b.display_price)
        break
      case 'price_desc':
        result.sort((a, b) => b.display_price - a.display_price)
        break
      case 'rating':
        result.sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count)
        break
      case 'newest':
        result.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        break
      case 'featured':
      default:
        result.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        break
    }

    return result
  }, [products, selectedCategory, selectedPrice, sort, inStockOnly])

  // Notify parent whenever filters change
  const prevFilteredRef = useState<ShopPublicProduct[]>([])[0]
  // Use effect-like pattern: compare and call onFilteredChange
  const currentKey = JSON.stringify(filtered.map((p) => p.id))
  const prevKeyRef = useState('')[1]
  // We can't use useEffect here in the same way, so we'll use a ref pattern
  // Actually let's use a custom hook approach below

  return (
    <div className={`${className}`}>
      {/* Filter bar */}
      <div className="flex flex-col gap-4">
        {/* Top row: category pills + sort */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.04em] transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-[var(--lux-text-primary)] text-white shadow-[var(--lux-shadow-sm)]'
                  : 'border border-[var(--lux-border-light)] bg-white text-[var(--lux-text-secondary)] hover:border-[var(--lux-border-gold)] hover:text-[var(--lux-text-primary)]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug === selectedCategory ? 'all' : cat.slug)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.04em] transition-all duration-200 ${
                  selectedCategory === cat.slug
                    ? 'bg-[var(--lux-text-primary)] text-white shadow-[var(--lux-shadow-sm)]'
                    : 'border border-[var(--lux-border-light)] bg-white text-[var(--lux-text-secondary)] hover:border-[var(--lux-border-gold)] hover:text-[var(--lux-text-primary)]'
                }`}
              >
                {cat.icon_emoji && <span className="text-[13px]">{cat.icon_emoji}</span>}
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 rounded-full border border-[var(--lux-border-light)] bg-white px-4 py-2 text-[12px] font-semibold text-[var(--lux-text-secondary)] transition hover:border-[var(--lux-border-gold)] hover:text-[var(--lux-text-primary)]"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{SORT_OPTIONS.find((o) => o.value === sort)?.label}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[200px] overflow-hidden rounded-[var(--lux-radius-lg)] border border-[var(--lux-border-light)] bg-white shadow-[var(--lux-shadow-lg)]"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { setSort(option.value); setSortOpen(false) }}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-[13px] font-semibold transition hover:bg-[var(--lux-bg-muted)] ${
                          sort === option.value ? 'text-[var(--lux-text-primary)]' : 'text-[var(--lux-text-muted)]'
                        }`}
                      >
                        {sort === option.value && <Check className="h-3.5 w-3.5 text-[var(--lux-gold)]" />}
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Second row: price pills + stock toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {PRICE_RANGES.map((range, i) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] transition-all duration-200 ${
                selectedPrice === i
                  ? 'border border-[var(--lux-gold)] bg-[var(--lux-gold-faint)] text-[var(--lux-gold)]'
                  : 'border border-[var(--lux-border-light)] bg-white text-[var(--lux-text-muted)] hover:border-[var(--lux-border-medium)] hover:text-[var(--lux-text-secondary)]'
              }`}
            >
              {range.label}
            </button>
          ))}

          <div className="mx-1 h-4 w-px bg-[var(--lux-border-light)]" />

          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] transition-all duration-200 ${
              inStockOnly
                ? 'border border-green-300 bg-green-50 text-green-700'
                : 'border border-[var(--lux-border-light)] bg-white text-[var(--lux-text-muted)] hover:border-[var(--lux-border-medium)] hover:text-[var(--lux-text-secondary)]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${inStockOnly ? 'bg-green-500' : 'bg-[var(--lux-text-subtle)]'}`} />
            In Stock
          </button>
        </div>

        {/* Active filter chips */}
        <AnimatePresence>
          {activeFilters.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-2"
            >
              {activeFilters.map((filter, i) => (
                <motion.span
                  key={`${filter.label}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lux-border-gold)] bg-[var(--lux-gold-faint)] px-3 py-1 text-[11px] font-semibold text-[var(--lux-gold)]"
                >
                  {filter.label}
                  <button type="button" onClick={filter.onRemove} className="ml-0.5 inline-flex hover:text-[var(--lux-text-primary)]">
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
              <button
                type="button"
                onClick={() => { setSelectedCategory('all'); setSelectedPrice(null); setInStockOnly(false) }}
                className="text-[11px] font-semibold text-[var(--lux-text-muted)] underline underline-offset-2 transition hover:text-[var(--lux-text-primary)]"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden: trigger parent update via a child effect wrapper */}
      <FilterChangeTrigger filtered={filtered} onChange={onFilteredChange} />
    </div>
  )
}

function FilterChangeTrigger({ filtered, onChange }: { filtered: ShopPublicProduct[]; onChange: (p: ShopPublicProduct[]) => void }) {
  const key = filtered.map((p) => p.id).join(',')
  const prevKeyRef = useRef('')

  useEffect(() => {
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key
      onChange(filtered)
    }
  }, [key, filtered, onChange])

  return null
}
