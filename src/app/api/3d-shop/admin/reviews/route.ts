import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { formatShopReviewerName } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

function parsePositiveInteger(value: string | null, fallback: number, max?: number) {
  const next = Number(value)
  if (!Number.isInteger(next) || next <= 0) return fallback
  return max ? Math.min(next, max) : next
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const approvedParam = searchParams.get('is_approved')
    const page = parsePositiveInteger(searchParams.get('page'), 1)
    const limit = parsePositiveInteger(searchParams.get('limit'), 20, 100)
    const from = (page - 1) * limit
    const to = from + limit - 1
    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('shelf_reviews')
      .select(`
        id,
        product_id,
        user_id,
        order_id,
        rating,
        title,
        body,
        image_urls,
        is_verified_purchase,
        is_approved,
        admin_reply,
        admin_replied_at,
        created_at,
        updated_at,
        product:shelf_products(id,name,slug,thumbnail_url),
        order:shelf_orders(id,order_number)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (approvedParam === 'true' || approvedParam === 'false') {
      query = query.eq('is_approved', approvedParam === 'true')
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const userIds = Array.from(new Set((data ?? []).map((review) => review.user_id).filter(Boolean)))
    const reviewers = new Map<string, { name: string; email: string | null }>()

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, full_name, email')
        .in('id', userIds)

      if (profileError) throw new Error(profileError.message)
      ;(profiles ?? []).forEach((profile) => {
        reviewers.set(profile.id, {
          name: formatShopReviewerName(profile.full_name || profile.name || profile.email || 'Verified customer'),
          email: profile.email ?? null,
        })
      })
    }

    return NextResponse.json({
      reviews: (data ?? []).map((review) => ({
        ...review,
        reviewer: reviewers.get(review.user_id) ?? { name: 'Verified customer', email: null },
      })),
      page,
      limit,
      total: count ?? 0,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
