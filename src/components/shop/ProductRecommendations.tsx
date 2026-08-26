'use client'

import { useEffect, useState } from 'react'
import ProductCard from '@/components/shop/ProductCard'
import type { ShopPublicProduct } from '@/lib/shop/public-types'

export default function ProductRecommendations({
  title,
  productId,
  categoryId,
  tags,
  limit = 6,
  compact = false,
}: {
  title: string
  productId?: string | null
  categoryId?: string | null
  tags?: string[]
  limit?: number
  compact?: boolean
}) {
  const [products, setProducts] = useState<ShopPublicProduct[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadRecommendations() {
      if (!productId && !categoryId && (!tags || tags.length === 0)) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (productId) params.set('productId', productId)
        if (categoryId) params.set('categoryId', categoryId)
        if (tags?.length) params.set('tags', tags.join(','))
        params.set('limit', String(limit))

        const response = await fetch(`/api/3d-shop/recommendations?${params.toString()}`)
        const data = await response.json().catch(() => ({})) as { products?: ShopPublicProduct[] }
        if (active && response.ok) setProducts(data.products ?? [])
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRecommendations()
    return () => {
      active = false
    }
  }, [categoryId, limit, productId, tags])

  if (!loading && products.length === 0) return null

  return (
    <section className={`${compact ? 'mt-8' : 'mt-16'} rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] md:p-8`}>
      <h2 className={`font-[var(--shop-font-heading)] ${compact ? 'text-xl' : 'text-3xl'} font-semibold text-[var(--shop-text-primary)]`}>{title}</h2>
      {loading && products.length === 0 ? (
        <div className="mt-6 grid auto-cols-[72%] grid-flow-col gap-4 overflow-hidden pb-2 scrollbar-hide sm:auto-cols-[42%] lg:grid-flow-row lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-white">
              <div className="aspect-[4/3] w-full animate-pulse bg-[var(--shop-bg-muted)]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-1/3 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
                <div className="h-5 w-24 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid auto-cols-[72%] grid-flow-col gap-4 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scroll-padding-left-4 sm:auto-cols-[42%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} className="h-full snap-start" />
          ))}
        </div>
      )}
    </section>
  )
}
