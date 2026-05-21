import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const skuId = searchParams.get('skuId')
    const isNotified = searchParams.get('is_notified')
    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('shelf_notify_me')
      .select(`
        id,
        product_id,
        sku_id,
        email,
        user_id,
        is_notified,
        created_at,
        product:shelf_products(id,name,slug,thumbnail_url),
        sku:shelf_skus(id,sku_code,variant_combination,stock_quantity,is_available)
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    if (productId) query = query.eq('product_id', productId)
    if (skuId) query = query.eq('sku_id', skuId)
    if (isNotified === 'true' || isNotified === 'false') {
      query = query.eq('is_notified', isNotified === 'true')
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ entries: data ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
