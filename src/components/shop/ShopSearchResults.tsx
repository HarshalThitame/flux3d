'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import type { ShopPublicProduct } from '@/lib/shop/public-types'

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

  return (
    <main className="px-4 pb-20 pt-5 md:px-8 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            router.push(`/3d-shop/search?q=${encodeURIComponent(draft.trim())}`)
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[52px] w-full rounded-2xl border border-[var(--border-light)] bg-white pl-11 pr-4 text-base outline-none focus:border-[var(--border-brand)]"
              placeholder="Search 3D Shop"
            />
          </div>
          <button type="submit" className="btn-primary min-h-[52px] px-5">
            Search
          </button>
        </form>

        <div className="mt-10">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
            {visibleProducts.length} results for &quot;{query}&quot;
          </h1>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-[var(--border-light)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">No products found</h2>
            <Link href="/3d-shop" className="btn-primary mt-6 inline-flex min-h-[48px] items-center px-6">
              Browse all categories
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
