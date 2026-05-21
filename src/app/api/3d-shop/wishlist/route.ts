import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getShopProductsByIds } from '@/lib/shop/public-data'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type WishlistBody = {
  productId?: unknown
}

function isDuplicateError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const record = error as { code?: string; message?: string }
  return record.code === '23505' || Boolean(record.message?.toLowerCase().includes('duplicate key'))
}

async function getUserId() {
  const authSupabase = await createServerSupabaseClient()
  const { data, error } = await authSupabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_wishlists')
      .select('product_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    const productIds = (data ?? []).map((item) => item.product_id)
    const products = await getShopProductsByIds(productIds)

    return NextResponse.json({ products, productIds: products.map((product) => product.id) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load wishlist.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json()) as WishlistBody
    const productId = typeof body.productId === 'string' ? body.productId.trim() : ''

    if (!productId) {
      return NextResponse.json({ error: 'Product is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('shelf_wishlists')
      .insert({ user_id: userId, product_id: productId })

    if (error && !isDuplicateError(error)) throw new Error(error.message)

    return NextResponse.json({ success: true, wishlisted: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update wishlist.' },
      { status: 500 }
    )
  }
}
