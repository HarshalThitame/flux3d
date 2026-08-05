import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAdAccountInsights } from '@/lib/meta/marketing-api'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/insights
 *
 * Returns aggregate account-level insights for the stats header cards
 * and charts (spend, impressions, clicks, CTR, conversions).
 */
export async function GET() {
  try {
    const supabase = await createServerClient()

    // ─── Auth check ────────────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    // ─── Fetch insights ────────────────────────────────────────────────────
    const todayInsights = await getAdAccountInsights('today')
    const last7dInsights = await getAdAccountInsights('last_7d')
    const last30dInsights = await getAdAccountInsights('last_30d')

    // ─── Aggregate ───────────────────────────────────────────────────────
    function aggregate(insights: { spend?: string; impressions?: string; clicks?: string; ctr?: string; conversions?: string }[]) {
      return insights.reduce(
        (acc, item) => ({
          spend: acc.spend + (Number(item.spend) || 0),
          impressions: acc.impressions + (Number(item.impressions) || 0),
          clicks: acc.clicks + (Number(item.clicks) || 0),
          conversions: acc.conversions + (Number(item.conversions) || 0),
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
      )
    }

    return NextResponse.json({
      today: aggregate(todayInsights),
      last7d: aggregate(last7dInsights),
      last30d: aggregate(last30dInsights),
    })
  } catch (err) {
    console.error('Meta insights error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to fetch insights',
      },
      { status: 500 },
    )
  }
}
