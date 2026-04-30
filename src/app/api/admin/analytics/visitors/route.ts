import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Anonymous visitors overview
    const { data: anonymousVisitors } = await supabase
      .from('anonymous_visitors')
      .select('id, location, device, source, visit_count')
      .gte('first_seen', today.toISOString())
      .order('first_seen', { ascending: false })
      .limit(50)

    // Source breakdown
    const { data: sourceData } = await supabase
      .from('anonymous_visitors')
      .select('source')
      .gte('first_seen', today.toISOString())

    const sourceBreakdown = (sourceData || []).reduce((acc: Record<string, number>, curr) => {
      const source = curr.source || 'Other'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    // First-time vs returning anonymous
    const firstTime = (anonymousVisitors || []).filter(v => v.visit_count === 1).length
    const returning = (anonymousVisitors || []).length - firstTime

    // Anonymous to registered conversion
    const { count: converted } = await supabase
      .from('anonymous_visitors')
      .select('*', { count: 'exact', head: true })
      .not('converted_to_user_id', 'is', null)
      .gte('first_seen', today.toISOString())

    const conversionRate = (anonymousVisitors || []).length
      ? ((converted || 0) / (anonymousVisitors || []).length * 100).toFixed(1)
      : '0.0'

    // Visitor behavior table (join with sessions and page_views)
    const { data: visitorBehavior } = await supabase
      .from('anonymous_visitors')
      .select(`
        visitor_id, location, device, source,
        sessions(
          session_id, started_at, duration_seconds, page_views_count,
          quote_checked, file_uploaded, order_placed,
          page_views(page_url, time_spent_seconds)
        )
      `)
      .gte('first_seen', today.toISOString())
      .order('first_seen', { ascending: false })
      .limit(20)

    // Intent signals
    const { count: highIntent } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('quote_checked', true)
      .gte('duration_seconds', 300)

    const { count: mediumIntent } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .gte('page_views_count', 3)
      .eq('quote_checked', false)

    const { count: lowIntent } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .lte('page_views_count', 2)

    // Page popularity
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('page_url, time_spent_seconds')
      .gte('entered_at', today.toISOString())

    const pagePopularity = (pageViews || []).reduce((acc: Record<string, { views: number; totalTime: number }>, curr) => {
      const url = curr.page_url
      if (!acc[url]) {
        acc[url] = { views: 0, totalTime: 0 }
      }
      acc[url].views++
      acc[url].totalTime += curr.time_spent_seconds || 0
      return acc
    }, {})

    const topPages = Object.entries(pagePopularity)
      .map(([url, data]) => ({
        url,
        views: data.views,
        avgTime: `${Math.floor((data.totalTime / data.views) / 60)} min ${Math.round((data.totalTime / data.views) % 60)} sec`,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // Quote tool usage
    const { count: totalQuotes } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const { count: withFile } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .not('file_path', 'is', null)

    const { count: reachedPayment } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('payment_reached', true)

    const { count: droppedAtPayment } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('payment_reached', true)
      .not('exited_at_step', 'is', null)

    const { count: convertedToOrder } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('order_placed', true)

    return NextResponse.json({
      anonymousVisitors: (anonymousVisitors || []).map(v => ({
        visitorId: v.id,
        location: v.location,
        device: v.device,
        source: v.source,
        visitCount: v.visit_count,
      })),
      sourceBreakdown: Object.entries(sourceBreakdown).map(([source, count]) => ({
        source,
        count,
        percent: `${((count as number / (anonymousVisitors || []).length) * 100).toFixed(1)}%`,
      })),
      firstTimeVisitors: firstTime,
      returningVisitors: returning,
      conversionToRegistered: {
        count: converted || 0,
        rate: `${conversionRate}%`,
      },
      visitorBehavior: (visitorBehavior || []).map(v => ({
        visitorId: v.visitor_id,
        location: v.location,
        device: v.device,
        source: v.source,
        sessions: (v.sessions || []).map((s: any) => ({
          sessionId: s.session_id,
          duration: s.duration_seconds,
          pagesVisited: s.page_views_count,
          quoteChecked: s.quote_checked,
          fileUploaded: s.file_uploaded,
          orderPlaced: s.order_placed,
          pages: (s.page_views || []).map((p: any) => ({
            pageUrl: p.page_url,
            timeSpent: p.time_spent_seconds,
          })),
        })),
      })),
      intentSignals: {
        highIntent: { count: highIntent || 0, action: 'Retarget via Google/Meta ads · Show exit-intent popup' },
        mediumIntent: { count: mediumIntent || 0, action: 'Show WhatsApp chat nudge' },
        lowIntent: { count: lowIntent || 0, action: 'Improve landing page for their traffic source' },
      },
      topPages,
      quoteUsage: {
        totalQuotes: totalQuotes || 0,
        withFile: withFile || 0,
        withoutFile: (totalQuotes || 0) - (withFile || 0),
        reachedPayment: reachedPayment || 0,
        droppedAtPayment: droppedAtPayment || 0,
        convertedToOrder: convertedToOrder || 0,
      },
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
