'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import * as Slider from '@radix-ui/react-slider'
import { Filter, X } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import type { ShopPublicCategory, ShopPublicProduct } from '@/lib/shop/public-types'

type VariantFilters = Record<string, string[]>

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

function productHasVariant(product: ShopPublicProduct, optionName: string, values: string[]) {
  if (values.length === 0) return true
  return product.variant_options.some((option) =>
    option.option_name === optionName && (option.values ?? []).some((value) => values.includes(value))
  )
}

function FilterPanel({
  variantFilters,
  selectedVariants,
  onVariantToggleAction,
  priceRange,
  selectedPrice,
  onPriceChangeAction,
  inStockOnly,
  onInStockChangeAction,
  ratingOnly,
  onRatingChangeAction,
  clearAction,
}: {
  variantFilters: Record<string, string[]>
  selectedVariants: VariantFilters
  onVariantToggleAction: (name: string, value: string) => void
  priceRange: [number, number]
  selectedPrice: [number, number]
  onPriceChangeAction: (value: [number, number]) => void
  inStockOnly: boolean
  onInStockChangeAction: (value: boolean) => void
  ratingOnly: boolean
  onRatingChangeAction: (value: boolean) => void
  clearAction: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 text-sm font-semibold text-[var(--shop-text-primary)]">Price</div>
        <Slider.Root
          value={selectedPrice}
          min={priceRange[0]}
          max={priceRange[1]}
          step={50}
          minStepsBetweenThumbs={1}
          onValueCommit={([min, max]) => onPriceChangeAction([min ?? priceRange[0], max ?? priceRange[1]])}
          className="relative flex h-8 touch-none select-none items-center"
        >
          <Slider.Track className="relative h-2 grow rounded-full bg-[var(--shop-bg-muted)]">
            <Slider.Range className="absolute h-full rounded-full bg-[var(--shop-gold)]" />
          </Slider.Track>
          <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-white bg-[var(--shop-gold)] shadow-[var(--shop-shadow-sm)]" />
          <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-white bg-[var(--shop-gold)] shadow-[var(--shop-shadow-sm)]" />
        </Slider.Root>
        <div className="mt-2 flex justify-between text-xs font-semibold text-[var(--shop-text-secondary)]">
          <span>₹{Math.round(selectedPrice[0]).toLocaleString('en-IN')}</span>
          <span>₹{Math.round(selectedPrice[1]).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {Object.entries(variantFilters).map(([name, values]) => (
        <div key={name}>
          <div className="mb-3 text-sm font-semibold text-[var(--shop-text-primary)]">{name}</div>
          <div className="space-y-2">
            {values.map((value) => (
              <label key={value} className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)]">
                <input
                  type="checkbox"
                  checked={(selectedVariants[name] ?? []).includes(value)}
                  onChange={() => onVariantToggleAction(name, value)}
                  className="h-4 w-4 accent-[var(--shop-gold)]"
                />
                {value}
              </label>
            ))}
          </div>
        </div>
      ))}

      <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)]">
        <input type="checkbox" checked={inStockOnly} onChange={(event) => onInStockChangeAction(event.target.checked)} className="h-4 w-4 accent-[var(--shop-gold)]" />
        In Stock Only
      </label>

      <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)]">
        <input type="checkbox" checked={ratingOnly} onChange={(event) => onRatingChangeAction(event.target.checked)} className="h-4 w-4 accent-[var(--shop-gold)]" />
        4★ & above
      </label>

      <button type="button" onClick={clearAction} className="min-h-[44px] w-full rounded-xl border border-[var(--shop-border-light)] bg-white text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]">
        Clear All Filters
      </button>
    </div>
  )
}

export default function ShopCategoryBrowser({
  category,
  products,
}: {
  category: ShopPublicCategory
  products: ShopPublicProduct[]
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [sort, setSort] = useState('featured')
  const priceRange = useMemo<[number, number]>(() => {
    if (products.length === 0) return [0, 1000]
    const prices = products.map((product) => product.display_price)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [products])
  const [selectedPrice, setSelectedPrice] = useState<[number, number]>(priceRange)
  const [selectedVariants, setSelectedVariants] = useState<VariantFilters>({})
  const [inStockOnly, setInStockOnly] = useState(false)
  const [ratingOnly, setRatingOnly] = useState(false)

  const variantFilters = useMemo(() => {
    const filters: Record<string, string[]> = {}
    products.forEach((product) => {
      product.variant_options.forEach((option) => {
        if (option.option_type === 'toggle' || option.option_type === 'text_input') return
        filters[option.option_name] = unique([...(filters[option.option_name] ?? []), ...(option.values ?? [])])
      })
    })
    return filters
  }, [products])

  const filteredProducts = useMemo(() => {
    const next = products.filter((product) => {
      if (product.display_price < selectedPrice[0] || product.display_price > selectedPrice[1]) return false
      if (inStockOnly && !product.in_stock) return false
      if (ratingOnly && product.avg_rating < 4) return false
      return Object.entries(selectedVariants).every(([name, values]) => productHasVariant(product, name, values))
    })

    if (sort === 'newest') next.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    if (sort === 'price_asc') next.sort((a, b) => a.display_price - b.display_price)
    if (sort === 'price_desc') next.sort((a, b) => b.display_price - a.display_price)
    if (sort === 'rating') next.sort((a, b) => b.avg_rating - a.avg_rating)
    if (sort === 'featured') next.sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
    return next
  }, [inStockOnly, products, ratingOnly, selectedPrice, selectedVariants, sort])

  const chips = [
    inStockOnly ? 'In stock' : null,
    ratingOnly ? '4★ & above' : null,
    ...Object.entries(selectedVariants).flatMap(([name, values]) => values.map((value) => `${name}: ${value}`)),
  ].filter(Boolean) as string[]

  function toggleVariant(name: string, value: string) {
    setSelectedVariants((current) => {
      const values = current[name] ?? []
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
      return { ...current, [name]: nextValues }
    })
  }

  function clearFilters() {
    setSelectedPrice(priceRange)
    setSelectedVariants({})
    setInStockOnly(false)
    setRatingOnly(false)
  }

  const panel = (
    <FilterPanel
      variantFilters={variantFilters}
      selectedVariants={selectedVariants}
      onVariantToggleAction={toggleVariant}
      priceRange={priceRange}
      selectedPrice={selectedPrice}
      onPriceChangeAction={setSelectedPrice}
      inStockOnly={inStockOnly}
      onInStockChangeAction={setInStockOnly}
      ratingOnly={ratingOnly}
      onRatingChangeAction={setRatingOnly}
      clearAction={clearFilters}
    />
  )

  return (
    <>
      <section className="relative min-h-[320px] overflow-hidden px-4 pb-12 pt-24 md:px-8 lg:px-16 lg:pt-32">
        {category.banner_image_url ? (
          <Image src={category.banner_image_url} alt={category.name} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[var(--shop-bg-muted)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--shop-text-primary)]/80 via-[var(--shop-text-primary)]/50 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white backdrop-blur-sm">
            {category.icon_emoji || '🧩'}
          </div>
          <h1 className="font-[var(--shop-font-heading)] mt-4 text-4xl font-semibold text-white md:text-6xl">{category.name}</h1>
          {category.description && <p className="mt-4 max-w-2xl text-lg leading-8 text-white/80">{category.description}</p>}
        </div>
      </section>

      {category.children && category.children.length > 0 && (
        <div className="px-4 pt-6 md:px-8 lg:px-16">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
            {category.children.map((child) => (
              <Link key={child.id} href={`/3d-shop/category/${child.slug}`} className="whitespace-nowrap rounded-full border border-[var(--shop-border-light)] bg-white px-4 py-2 text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)] hover:text-[var(--shop-gold)]">
                {child.icon_emoji || '🧩'} {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="px-4 py-10 md:px-8 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] lg:block">
            {panel}
          </aside>

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white px-4 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-border-gold)] lg:hidden"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
                <span className="text-sm font-medium text-[var(--shop-text-muted)]">{filteredProducts.length} products</span>
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm font-semibold text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {chips.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-3 py-1 text-xs font-semibold text-[var(--shop-gold)]">
                    {chip}
                  </span>
                ))}
                <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[var(--shop-text-muted)] transition hover:text-[var(--shop-gold)]">
                  Clear
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {filterOpen && (
        <div className="fixed inset-0 z-[120] bg-[var(--shop-bg-base)] p-5 lg:hidden">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">Filters</h2>
            <button type="button" onClick={() => setFilterOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--shop-border-light)] bg-white">
              <X className="h-4 w-4 text-[var(--shop-text-secondary)]" />
            </button>
          </div>
          <div className="h-[calc(100vh-96px)] overflow-y-auto pb-8">{panel}</div>
        </div>
      )}
    </>
  )
}
