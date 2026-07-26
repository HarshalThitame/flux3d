import type { Metadata } from 'next'
import ShopShell from '@/components/shop/ShopShell'
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
    <ShopShell transparentNav>
      <ShopSearchResults query={query || 'all products'} products={result.products} />
    </ShopShell>
  )
}
