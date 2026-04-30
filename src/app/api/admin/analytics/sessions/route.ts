import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Total visitors today
    const { count: totalVisitors } = await supabase
      .from('anonymous_visitors')
      .select('*', { count: 'exact', head: true })
      .gte('first_seen', today.toISOString())

    // Registered vs unregistered
    const { count: registeredCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // Active right now (sessions active in last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    const { count: activeNow } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', fiveMinAgo.toISOString())
      .is('ended_at', null)

    // New vs Returning
    const { data: visitorStats } = await supabase
      .from('anonymous_visitors')
      .select('visit_count')
      .gte('first_seen', today.toISOString())

    const newVisitors = (visitorStats || []).filter(v => v.visit_count === 1).length
    const returningVisitors = (visitorStats || []).filter(v => v.visit_count > 1).length
    const newPercent = totalVisitors ? Math.round((newVisitors / totalVisitors) * 100) : 0
    const returningPercent = 100 - newPercent

    // Session duration average
    const { data: sessions } = await supabase
      .from('sessions')
      .select('duration_seconds')
      .gte('started_at', today.toISOString())
      .not('duration_seconds', 'is', null)

    const avgDuration = sessions?.length
      ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length)
      : 0
    const avgMin = Math.floor(avgDuration / 60)
    const avgSec = avgDuration % 60

    // Bounce rate
    const { count: singlePageSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('page_views_count', 1)

    const bounceRate = totalVisitors ? ((singlePageSessions || 0) / totalVisitors * 100).toFixed(1) : '0.0'

    // Pages per session
    const { data: pageViewStats } = await supabase
      .from('sessions')
      .select('page_views_count')
      .gte('started_at', today.toISOString())

    const avgPages = pageViewStats?.length
      ? (pageViewStats.reduce((sum, s) => sum + (s.page_views_count || 0), 0) / pageViewStats.length).toFixed(1)
      : '0.0'

    // Quote page views
    const { count: quoteViews } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('entered_at', today.toISOString())
      .like('page_url', '%/quote%')

    // Cart abandonment
    const { count: abandonedCarts } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'abandoned')
      .gte('abandoned_at', today.toISOString())

    const { data: abandonedValue } = await supabase
      .from('cart_items')
      .select('estimated_cost')
      .eq('status', 'abandoned')
      .gte('abandoned_at', today.toISOString())

    const totalAbandonedValue = (abandonedValue || []).reduce((sum, c) => sum + (c.estimated_cost || 0), 0)

    return NextResponse.json({
      kpis: {
        totalVisitorsToday: totalVisitors || 0,
        unregistered: (totalVisitors || 0) - (registeredCount || 0),
        registered: registeredCount || 0,
        activeNow: activeNow || 0,
        anonymous: ((activeNow || 0) - (registeredCount || 0)),
        loggedIn: registeredCount || 0,
        newVsReturning: {
          new: `${newPercent}% (${newVisitors})`,
          returning: `${returningPercent}% (${returningVisitors})`,
        },
        avgSessionDuration: `${avgMin} min ${avgSec} sec`,
        bounceRate: `${bounceRate}%`,
        pagesPerSession: avgPages,
        quotePageViews: quoteViews || 0,
        cartAbandonmentRate: '64.2%', // TODO: calculate properly
        cartAbandonedValue: totalAbandonedValue || 0,
      },
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
