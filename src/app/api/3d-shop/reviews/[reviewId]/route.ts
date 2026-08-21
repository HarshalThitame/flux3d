import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { invalidateShopDataCache } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

type PatchBody = {
  rating?: unknown
  title?: unknown
  body?: unknown
  imageUrls?: unknown
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
}

export async function PATCH(request: Request, context: { params: Promise<{ reviewId: string }> }) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reviewId } = await context.params
    const body = (await request.json()) as PatchBody
    const rating = Number(body.rating)
    const title = normalizeText(body.title, 100)
    const reviewBody = normalizeText(body.body, 500)
    const imageUrls = normalizeImageUrls(body.imageUrls)

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    const { data: existing, error: fetchError } = await supabase
      .from('shelf_reviews')
      .select('id, user_id, created_at')
      .eq('id', reviewId)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 })
    }
    if (existing.user_id !== authData.user.id) {
      return NextResponse.json({ error: 'You can only edit your own reviews.' }, { status: 403 })
    }

    const createdAt = existing.created_at ? new Date(existing.created_at).getTime() : 0
    if (Date.now() - createdAt > EDIT_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Reviews can only be edited within 30 days of submission.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('shelf_reviews')
      .update({
        rating,
        title: title || null,
        body: reviewBody || null,
        image_urls: imageUrls,
      })
      .eq('id', reviewId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    invalidateShopDataCache()
    return NextResponse.json({ review: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update review.' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ reviewId: string }> }) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reviewId } = await context.params
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: fetchError } = await supabase
      .from('shelf_reviews')
      .select('id, user_id')
      .eq('id', reviewId)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    if (!existing) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 })
    }
    if (existing.user_id !== authData.user.id) {
      return NextResponse.json({ error: 'You can only delete your own reviews.' }, { status: 403 })
    }

    const { error } = await supabase.from('shelf_reviews').delete().eq('id', reviewId)
    if (error) throw new Error(error.message)
    invalidateShopDataCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete review.' },
      { status: 500 }
    )
  }
}
