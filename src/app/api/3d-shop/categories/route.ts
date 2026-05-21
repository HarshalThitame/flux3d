import { NextResponse } from 'next/server'
import { buildShopCategoryTree, getShopCategories } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await getShopCategories()
    return NextResponse.json({ categories: buildShopCategoryTree(categories) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load categories.' },
      { status: 500 }
    )
  }
}
