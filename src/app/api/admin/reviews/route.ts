import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import { reportError } from '@/lib/error-handling'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const orderType = searchParams.get('order_type')
    const featured = searchParams.get('featured')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    const supabase = createAdminSupabaseClient()
    let query = supabase
      .from('reviews')
      .select('*, review_links(sent_at, opened_at, used_at)', { count: 'exact' })
      .order('submitted_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (orderType) query = query.eq('order_type', orderType)
    if (featured !== null) query = query.eq('featured', featured === 'true')

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({ reviews: data, total: count, page, limit })
  } catch (error) {
    reportError(error, 'Failed to fetch reviews')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
