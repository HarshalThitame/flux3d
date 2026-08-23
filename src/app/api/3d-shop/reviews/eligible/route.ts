import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type EligibleReviewProduct = {
  productId: string
  productName: string
  productThumbnail: string | null
  orderId: string
  orderNumber: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getItemProductId(item: unknown) {
  if (!isRecord(item)) return ''
  return typeof item.productId === 'string'
    ? item.productId
    : typeof item.product_id === 'string'
      ? item.product_id
      : ''
}

export async function GET(request: Request) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const targetProductId = searchParams.get('productId')
    const supabase = createAdminSupabaseClient()

    const { data: orders, error: ordersError } = await supabase
      .from('shelf_orders')
      .select('id, order_number, items')
      .eq('user_id', authData.user.id)
      .eq('fulfilment_status', 'delivered')
      .order('placed_at', { ascending: false })

    if (ordersError) throw new Error(ordersError.message)

    const deliveredItems: EligibleReviewProduct[] = []
    for (const order of orders ?? []) {
      const items = Array.isArray(order.items) ? order.items : []
      for (const item of items) {
        if (!isRecord(item)) continue
        const productId = getItemProductId(item)
        if (!productId) continue
        deliveredItems.push({
          productId,
          productName: String(item.productName ?? item.product_name ?? '3D Shop product'),
          productThumbnail: item.productThumbnail || item.product_thumbnail
            ? String(item.productThumbnail ?? item.product_thumbnail)
            : null,
          orderId: String(order.id),
          orderNumber: String(order.order_number),
        })
      }
    }

    const productIds = Array.from(new Set(deliveredItems.map((item) => item.productId)))
    const orderIds = Array.from(new Set(deliveredItems.map((item) => item.orderId)))

    const reviewedKeys = new Set<string>()
    if (productIds.length > 0 && orderIds.length > 0) {
      const { data: reviews, error: reviewsError } = await supabase
        .from('shelf_reviews')
        .select('product_id, order_id')
        .eq('user_id', authData.user.id)
        .in('product_id', productIds)
        .in('order_id', orderIds)

      if (reviewsError) throw new Error(reviewsError.message)
      ;(reviews ?? []).forEach((review) => {
        reviewedKeys.add(`${review.order_id}:${review.product_id}`)
      })
    }

    const productDetails = new Map<string, { name: string; thumbnail_url: string | null }>()
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('shelf_products')
        .select('id, name, thumbnail_url')
        .in('id', productIds)

      if (productsError) throw new Error(productsError.message)
      ;(products ?? []).forEach((product) => {
        productDetails.set(product.id, { name: product.name, thumbnail_url: product.thumbnail_url ?? null })
      })
    }

    const eligible = deliveredItems
      .filter((item) => !reviewedKeys.has(`${item.orderId}:${item.productId}`))
      .map((item) => {
        const product = productDetails.get(item.productId)
        return {
          ...item,
          productName: product?.name ?? item.productName,
          productThumbnail: product?.thumbnail_url ?? item.productThumbnail,
        }
      })

    if (targetProductId) {
      const hasDeliveredPurchase = deliveredItems.some((item) => item.productId === targetProductId)
      const productEligible = eligible.find((item) => item.productId === targetProductId) ?? null
      const alreadyReviewed = hasDeliveredPurchase && !productEligible
      return NextResponse.json({
        eligible: productEligible,
        hasDeliveredPurchase,
        alreadyReviewed,
      })
    }

    return NextResponse.json(eligible)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load review eligibility.' },
      { status: 500 }
    )
  }
}
