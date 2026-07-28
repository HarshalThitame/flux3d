import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-analytics
 *
 * Query params:
 *   range — 'today' | '7d' | '30d' | 'custom'
 *   from  — ISO date (required for custom)
 *   to    — ISO date (required for custom)
 *
 * Returns aggregated email stats.
 */
export async function GET(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') ?? '7d'
    let from = searchParams.get('from')
    let to = searchParams.get('to')

    const now = new Date()
    let startDate: Date
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        if (!from || !to) {
          return NextResponse.json(
            { error: 'Custom range requires from and to dates' },
            { status: 400 }
          )
        }
        startDate = new Date(from)
        endDate = new Date(to)
        break
      case '7d':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    const supabase = createAdminClient()

    // 1. Total emails sent in range
    const { count: totalSent } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', startIso)
      .lt('sent_at', endIso)

    // 2. Delivered count
    const { count: deliveredCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', startIso)
      .lt('sent_at', endIso)
      .eq('status', 'delivered')

    // 3. Failed count
    const { count: failedCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', startIso)
      .lt('sent_at', endIso)
      .eq('status', 'failed')

    // 4. Bounced count
    const { count: bouncedCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', startIso)
      .lt('sent_at', endIso)
      .eq('status', 'bounced')

    // 5. Opened events count (from email_events)
    const { count: openedCount } = await supabase
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .eq('event_type', 'opened')

    // 6. Clicked events count
    const { count: clickedCount } = await supabase
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .eq('event_type', 'clicked')

    // 7. Top templates by volume (with fallback if RPC doesn't exist)
    let topTemplates: any[] = []
    try {
      const { data } = await supabase.rpc('get_top_email_templates', {
        start_date: startIso,
        end_date: endIso,
      })
      topTemplates = data ?? []
    } catch {
      // Fallback: simple grouped query if RPC is not available
      const { data } = await supabase
        .from('email_logs')
        .select('template_name, count')
        .gte('sent_at', startIso)
        .lt('sent_at', endIso)
        .order('count', { ascending: false })
        .limit(5)
      topTemplates = data ?? []
    }

    // 8. Top opened templates (fallback query if RPC missing)
    let topOpenedTemplates: any[] = []
    try {
      const { data } = await supabase
        .from('email_logs')
        .select('template_name, count')
        .eq('status', 'delivered')
        .gte('sent_at', startIso)
        .lt('sent_at', endIso)
        .not('opened_at', 'is', null)
        .order('count', { ascending: false })
        .limit(5)
      topOpenedTemplates = data ?? []
    } catch {
      // RPC or advanced query may not exist; ignore
    }

    // Calculate rates
    const total = totalSent ?? 0
    const delivered = deliveredCount ?? 0
    const failed = failedCount ?? 0
    const bounced = bouncedCount ?? 0
    const opened = openedCount ?? 0
    const clicked = clickedCount ?? 0

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0
    const bounceRate = total > 0 ? Math.round((bounced / total) * 1000) / 10 : 0
    const failureRate = total > 0 ? Math.round((failed / total) * 1000) / 10 : 0
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0
    const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 1000) / 10 : 0

    // Build daily time-series history for the selected range
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const historyDays = Math.min(daysDiff, 30) // cap at 30 points for performance
    const history: { date: string; sent: number; delivered: number; failed: number; opened: number; clicked: number }[] = []

    for (let i = historyDays - 1; i >= 0; i--) {
      const d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i)
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()

      const [{ count: dSent }, { count: dDelivered }, { count: dFailed }, { count: dOpened }, { count: dClicked }] = await Promise.all([
        supabase.from('email_logs').select('*', { count: 'exact', head: true }).gte('sent_at', dStart).lt('sent_at', dEnd),
        supabase.from('email_logs').select('*', { count: 'exact', head: true }).gte('sent_at', dStart).lt('sent_at', dEnd).eq('status', 'delivered'),
        supabase.from('email_logs').select('*', { count: 'exact', head: true }).gte('sent_at', dStart).lt('sent_at', dEnd).eq('status', 'failed'),
        supabase.from('email_events').select('*', { count: 'exact', head: true }).gte('created_at', dStart).lt('created_at', dEnd).eq('event_type', 'opened'),
        supabase.from('email_events').select('*', { count: 'exact', head: true }).gte('created_at', dStart).lt('created_at', dEnd).eq('event_type', 'clicked'),
      ])

      history.push({
        date: d.toISOString().slice(0, 10),
        sent: dSent ?? 0,
        delivered: dDelivered ?? 0,
        failed: dFailed ?? 0,
        opened: dOpened ?? 0,
        clicked: dClicked ?? 0,
      })
    }

    return NextResponse.json({
      range,
      startDate: startIso,
      endDate: endIso,
      totals: {
        sent: total,
        delivered,
        failed,
        bounced,
        opened,
        clicked,
      },
      rates: {
        deliveryRate,
        bounceRate,
        failureRate,
        openRate,
        clickRate,
      },
      history,
      topTemplates: topTemplates ?? [],
      topOpenedTemplates,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
