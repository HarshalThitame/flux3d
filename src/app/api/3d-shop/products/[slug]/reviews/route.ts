import { NextResponse } from 'next/server'
import { getShopProductBySlug, getShopProductReviews } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const { searchParams } = new URL(request.url)
    const product = await getShopProductBySlug(slug)
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 10)
    return NextResponse.json(await getShopProductReviews(product.id, page, limit), { headers: PUBLIC_CACHE_HEADERS })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load reviews.' },
      { status: 500 }
    )
  }
}
