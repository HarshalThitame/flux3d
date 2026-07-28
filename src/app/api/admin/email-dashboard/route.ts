import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-dashboard
 *
 * Returns high-level email metrics for the admin dashboard.
 */
export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminClient()
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

    // 1. Emails sent today
    const { count: sentToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', todayStart)
      .lt('sent_at', todayEnd)

    // 2. Delivered today
    const { count: deliveredToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', todayStart)
      .lt('sent_at', todayEnd)
      .eq('status', 'delivered')

    // 3. Failed today
    const { count: failedToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', todayStart)
      .lt('sent_at', todayEnd)
      .eq('status', 'failed')

    // 4. Bounced today
    const { count: bouncedToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', todayStart)
      .lt('sent_at', todayEnd)
      .eq('status', 'bounced')

    // 5. Queue size (queued + sending + failed awaiting retry)
    const { count: queueSize } = await supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['queued', 'sending', 'failed'])

    // 6. Avg delivery time today (ms)
    const { data: deliveryTimes } = await supabase
      .from('email_logs')
      .select('sent_at, delivered_at')
      .gte('sent_at', todayStart)
      .lt('sent_at', todayEnd)
      .not('delivered_at', 'is', null)
      .limit(500)

    let avgDeliveryMs = 0
    if (deliveryTimes && deliveryTimes.length > 0) {
      const totalMs = deliveryTimes.reduce((sum, row) => {
        const sent = new Date(row.sent_at!).getTime()
        const delivered = new Date(row.delivered_at!).getTime()
        return sum + (delivered - sent)
      }, 0)
      avgDeliveryMs = Math.round(totalMs / deliveryTimes.length)
    }

    // 7. Open rate today
    const { count: openedToday } = await supabase
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lt('created_at', todayEnd)
      .eq('event_type', 'opened')

    const openRate = deliveredToday && deliveredToday > 0
      ? Math.round(((openedToday ?? 0) / deliveredToday) * 1000) / 10
      : 0

    // 8. Click rate today
    const { count: clickedToday } = await supabase
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lt('created_at', todayEnd)
      .eq('event_type', 'clicked')

    const clickRate = deliveredToday && deliveredToday > 0
      ? Math.round(((clickedToday ?? 0) / deliveredToday) * 1000) / 10
      : 0

    // 9. Most used template today
    const { data: mostUsed } = await supabase
      .from('email_logs')
      .select('template_name, count')
      .gte('sent_at', todayStart)
      .lt('sent_at', todayEnd)
      .order('count', { ascending: false })
      .limit(1)

    // 10. Failed templates today
    const { data: failedTemplates } = await supabase
      .from('email_logs')
      .select('template_name, count')
      .gte('sent_at', todayStart)
      .lt('sent_at', todayEnd)
      .eq('status', 'failed')
      .order('count', { ascending: false })
      .limit(5)

    // 11. Success rate today
    // Note: failed emails are already counted in sentToday (they were sent, then failed),
    // so we use sentToday as the total attempted count.
    const attemptedToday = sentToday ?? 0
    const successRate = attemptedToday > 0
      ? Math.round(((deliveredToday ?? 0) / attemptedToday) * 1000) / 10
      : 0

    // 12. 7-day daily history
    const history: { date: string; sent: number; delivered: number; failed: number; opened: number; clicked: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
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
      today: {
        sent: sentToday ?? 0,
        delivered: deliveredToday ?? 0,
        failed: failedToday ?? 0,
        bounced: bouncedToday ?? 0,
        successRate,
      },
      queue: {
        size: queueSize ?? 0,
      },
      performance: {
        avgDeliveryMs,
        openRate,
        clickRate,
      },
      templates: {
        mostUsed: mostUsed?.[0] ?? null,
        failedList: failedTemplates ?? [],
      },
      history,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
