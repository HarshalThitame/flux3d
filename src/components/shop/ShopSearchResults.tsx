'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import { trackMetaEvent } from '@/lib/meta/event-utils'

export default function ShopSearchResults({
  query,
  products,
}: {
  query: string
  products: ShopPublicProduct[]
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(query)
  const visibleProducts = useMemo(() => products, [products])

  useEffect(() => {
    if (!query || query === 'all products') return
    trackMetaEvent('Search', { search_string: query })
  }, [query])

  return (
    <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            router.push(`/3d-shop/search?q=${encodeURIComponent(draft.trim())}`)
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shop-text-muted)]" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[52px] w-full rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white pl-11 pr-4 text-base text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
              placeholder="Search 3D Shop"
            />
          </div>
          <button type="submit" className="min-h-[52px] rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] px-6 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-text-secondary)] hover:shadow-[var(--shop-shadow-md)]">
            Search
          </button>
        </form>

        <div className="mt-10">
          <h1 className="font-[var(--shop-font-heading)] text-3xl font-semibold text-[var(--shop-text-primary)]">
            {visibleProducts.length} results for &quot;{query}&quot;
          </h1>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-8 text-center shadow-[var(--shop-shadow-sm)]">
            <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">No products found</h2>
            <Link href="/3d-shop" className="mt-6 inline-flex min-h-[48px] items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)]">
              Browse all categories
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
