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
    <section className={`${compact ? 'mt-8' : 'mt-16'} rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-8`}>
      <h2 className={`${compact ? '!text-xl' : '!text-3xl'} font-extrabold text-[var(--text-primary)]`}>{title}</h2>
      {loading && products.length === 0 ? (
        <div className="mt-6 text-sm font-semibold text-[var(--text-secondary)]">Loading products...</div>
      ) : (
        <div className="mt-6 grid auto-cols-[72%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[42%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
