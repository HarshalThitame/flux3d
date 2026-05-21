import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ShopSearchResults from '@/components/shop/ShopSearchResults'
import { getShopProducts } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search — 3D Shop',
  description: 'Search ready-to-ship products on 3D Shop by Flux3D.',
}

export default async function ShopSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; featured?: string }>
}) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const result = await getShopProducts({
    search: query,
    featured: params.featured === 'true',
    limit: 96,
    sort: params.featured === 'true' ? 'featured' : 'newest',
  })

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ShopSearchResults query={query || 'all products'} products={result.products} />
    </div>
  )
}
