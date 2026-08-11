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
    prefix: 'admin_customer_whatsapp_get',
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

    const { data: messages, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({
      messages: (messages || []).map(m => ({
        id: String(m.id),
        direction: m.direction,
        messageText: m.message_text,
        automated: m.automated,
        triggerEvent: m.trigger_event,
        responded: m.responded,
        responseTimeMinutes: m.response_time_minutes,
        createdAt: m.created_at,
      }))
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
