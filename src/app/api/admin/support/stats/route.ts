import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'

/**
 * GET /api/admin/support/stats
 *
 * Returns enterprise dashboard stats for the support inbox.
 */
export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    const now = new Date().toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartIso = todayStart.toISOString()

    // Parallel counts
    const [
      openResult,
      pendingResult,
      urgentResult,
      unassignedResult,
      todayResult,
      resolvedTodayResult,
    ] = await Promise.all([
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'In Progress'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('priority', 'Urgent').in('status', ['Open', 'In Progress']),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).is('assigned_to', null).in('status', ['Open', 'In Progress']),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).gte('created_at', todayStartIso),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Resolved').gte('updated_at', todayStartIso),
    ])

    // Average first response time (time between ticket creation and first admin reply)
    const { data: avgData } = await supabase.rpc('support_avg_first_response_time')

    return NextResponse.json({
      open: openResult.count ?? 0,
      pending: pendingResult.count ?? 0,
      urgent: urgentResult.count ?? 0,
      unassigned: unassignedResult.count ?? 0,
      today: todayResult.count ?? 0,
      resolvedToday: resolvedTodayResult.count ?? 0,
      avgFirstResponseMinutes: avgData ?? null,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
