import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ReviewBody = {
  productId?: unknown
  orderId?: unknown
  rating?: unknown
  title?: unknown
  body?: unknown
  imageUrls?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
}

function orderContainsProduct(items: unknown, productId: string) {
  if (!Array.isArray(items)) return false
  return items.some((item) => {
    if (!isRecord(item)) return false
    return item.productId === productId || item.product_id === productId
  })
}

function isDuplicateError(error: unknown) {
  if (!isRecord(error)) return false
  const code = typeof error.code === 'string' ? error.code : ''
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : ''
  return code === '23505' || message.includes('duplicate key')
}

export async function POST(request: Request) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as ReviewBody
    const productId = normalizeText(body.productId, 80)
    const orderId = normalizeText(body.orderId, 80)
    const rating = Number(body.rating)
    const title = normalizeText(body.title, 100)
    const reviewBody = normalizeText(body.body, 500)
    const imageUrls = normalizeImageUrls(body.imageUrls)

    if (!productId || !orderId) {
      return NextResponse.json({ error: 'Product and order are required.' }, { status: 400 })
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: order, error: orderError } = await supabase
      .from('shelf_orders')
      .select('id, items')
      .eq('id', orderId)
      .eq('user_id', authData.user.id)
      .eq('order_status', 'delivered')
      .maybeSingle()

    if (orderError) throw new Error(orderError.message)
    if (!order || !orderContainsProduct(order.items, productId)) {
      return NextResponse.json(
        { error: 'Only delivered purchases can be reviewed.' },
        { status: 400 }
      )
    }

    const { data: existingReview, error: existingError } = await supabase
      .from('shelf_reviews')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('order_id', orderId)
      .eq('product_id', productId)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)
    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product for this order.' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('shelf_reviews').insert({
      product_id: productId,
      order_id: orderId,
      user_id: authData.user.id,
      rating,
      title: title || null,
      body: reviewBody || null,
      image_urls: imageUrls,
      is_verified_purchase: true,
      is_approved: false,
    })

    if (insertError) {
      if (isDuplicateError(insertError)) {
        return NextResponse.json({ error: 'You have already reviewed this product for this order.' }, { status: 400 })
      }
      throw new Error(insertError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted. It will appear after approval.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit review.' },
      { status: 500 }
    )
  }
}
