import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { rateLimitResponse } from '@/lib/rate-limit'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customer_pageviews_get',
    windowSeconds: 60,
    maxRequests: 120,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  try {
    const params = await context.params
    const userId = params.id
    const supabase = createAdminSupabaseClient()

    const { data: pageViews, error } = await supabase
      .from('page_views')
      .select(`
        *,
        sessions!inner(session_id, user_id, started_at)
      `)
      .eq('sessions.user_id', userId)
      .order('entered_at', { ascending: false })
      .limit(200)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      pageViews: (pageViews || []).map(p => ({
        id: String(p.id),
        sessionId: p.sessions?.session_id,
        pageUrl: p.page_url,
        pageTitle: p.page_title,
        enteredAt: p.entered_at,
        exitedAt: p.exited_at,
        timeSpentSeconds: p.time_spent_seconds,
        scrollDepthPercent: p.scroll_depth_percent,
        actionsTaken: p.actions_taken,
      }))
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
