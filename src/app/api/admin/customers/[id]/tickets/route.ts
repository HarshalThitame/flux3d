import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  try {
    const params = await context.params
    const userId = params.id
    const supabase = createAdminSupabaseClient()

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({
      tickets: (tickets || []).map(t => ({
        id: String(t.id),
        ticketId: t.ticket_id,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assigned_to ? String(t.assigned_to) : null,
        resolutionTimeMinutes: t.resolution_time_minutes,
        satisfactionRating: t.satisfaction_rating,
        createdAt: t.created_at,
      }))
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
