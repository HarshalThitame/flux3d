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
    prefix: 'admin_customer_sessions_get',
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

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      sessions: (sessions || []).map(s => ({
        id: String(s.id),
        sessionId: s.session_id,
        userId: s.user_id ? String(s.user_id) : null,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        durationSeconds: s.duration_seconds,
        pageViewsCount: s.page_views_count,
        quoteChecked: s.quote_checked,
        fileUploaded: s.file_uploaded,
        orderPlaced: s.order_placed,
        paymentReached: s.payment_reached,
        exitedAtStep: s.exited_at_step,
        exitReason: s.exit_reason,
        device: s.device,
        location: s.location,
        ipAddress: s.ip_address,
        referrer: s.referrer,
      }))
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
