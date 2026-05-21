import { NextResponse } from 'next/server'
import { getShopProductBySlug } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const product = await getShopProductBySlug(slug)
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    return NextResponse.json({ product })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load product.' },
      { status: 500 }
    )
  }
}
