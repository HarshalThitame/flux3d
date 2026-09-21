import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { reportError } from '@/lib/error-handling'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, review_text, customer_display_name, customer_avatar_seed, order_type, featured, submitted_at')
      .eq('status', 'approved')
      .order('featured', { ascending: false })
      .order('rating', { ascending: false })
      .order('submitted_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    reportError(error, 'Failed to fetch testimonials')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
