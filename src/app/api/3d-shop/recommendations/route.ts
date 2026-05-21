import { NextResponse } from 'next/server'
import { getShopRecommendations } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tags = searchParams.get('tags')
      ?.split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const products = await getShopRecommendations({
      productId: searchParams.get('productId'),
      categoryId: searchParams.get('categoryId'),
      tags,
      limit: Number(searchParams.get('limit') ?? 6),
    })

    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load recommendations.' },
      { status: 500 }
    )
  }
}
