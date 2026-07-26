'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import { useShopWishlistStore } from '@/stores/shopWishlistStore'

export default function ShopWishlistClient() {
  const [products, setProducts] = useState<ShopPublicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const wishlistedIds = useShopWishlistStore((state) => state.wishlistedIds)
  const setWishlist = useShopWishlistStore((state) => state.setWishlist)

  useEffect(() => {
    let active = true

    async function loadWishlist() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/3d-shop/wishlist')
        const data = await response.json().catch(() => ({})) as {
          products?: ShopPublicProduct[]
          productIds?: string[]
          error?: string
        }
        if (!response.ok) throw new Error(data.error || 'Failed to load wishlist.')
        if (!active) return
        setProducts(data.products ?? [])
        setWishlist(data.productIds ?? [])
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load wishlist.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadWishlist()
    return () => {
      active = false
    }
  }, [setWishlist])

  const visibleProducts = useMemo(() => {
    const saved = products.filter((product) => wishlistedIds.has(product.id))
    return inStockOnly ? saved.filter((product) => product.in_stock) : saved
  }, [inStockOnly, products, wishlistedIds])

  return (
    <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-6 shadow-[var(--shop-shadow-sm)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">3D Shop</p>
            <h1 className="font-[var(--shop-font-heading)] mt-2 text-[clamp(2rem,6vw,3rem)] font-semibold text-[var(--shop-text-primary)] md:text-4xl">
              My Wishlist ({visibleProducts.length} item{visibleProducts.length === 1 ? '' : 's'})
            </h1>
          </div>
          <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-4 text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)]">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
              className="h-4 w-4 accent-[var(--shop-gold)]"
            />
            In Stock Only
          </label>
        </div>

        {loading ? (
          <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-8 text-center text-[var(--shop-text-secondary)] shadow-[var(--shop-shadow-sm)]">
            Loading wishlist...
          </div>
        ) : error ? (
          <div className="rounded-[var(--shop-radius-xl)] border border-rose-200 bg-rose-50 p-8 text-center font-semibold text-rose-700">
            {error}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-10 text-center shadow-[var(--shop-shadow-sm)]">
            <Heart className="mx-auto h-14 w-14 text-rose-500" />
            <h2 className="font-[var(--shop-font-heading)] mt-4 text-2xl font-semibold text-[var(--shop-text-primary)]">Nothing saved yet</h2>
            <Link href="/3d-shop" className="mt-6 inline-flex min-h-[48px] items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)]">
              Start browsing →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} actionLabel="Move to Cart" index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
