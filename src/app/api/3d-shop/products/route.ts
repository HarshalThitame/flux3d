import { NextResponse } from 'next/server'
import { getShopProducts } from '@/lib/shop/public-data'
import type { ShopProductQuery } from '@/lib/shop/public-types'

export const dynamic = 'force-dynamic'

function toNumber(value: string | null) {
  if (value === null || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort')
    const query: ShopProductQuery = {
      category_id: searchParams.get('category_id'),
      category_slug: searchParams.get('category_slug'),
      featured: searchParams.get('featured') === 'true',
      search: searchParams.get('search'),
      min_price: toNumber(searchParams.get('min_price')),
      max_price: toNumber(searchParams.get('max_price')),
      in_stock: searchParams.get('in_stock') === 'true',
      sort: sort === 'price_asc' || sort === 'price_desc' || sort === 'newest' || sort === 'featured' || sort === 'rating'
        ? sort
        : undefined,
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 24),
    }

    return NextResponse.json(await getShopProducts(query))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load products.' },
      { status: 500 }
    )
  }
}
