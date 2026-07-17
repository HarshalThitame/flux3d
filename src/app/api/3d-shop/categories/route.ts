import { NextResponse } from 'next/server'
import { buildShopCategoryTree, getShopCategories } from '@/lib/shop/public-data'

export const revalidate = 300

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

export async function GET() {
  try {
    const categories = await getShopCategories()
    return NextResponse.json({ categories: buildShopCategoryTree(categories) }, { headers: PUBLIC_CACHE_HEADERS })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load categories.' },
      { status: 500 }
    )
  }
}
