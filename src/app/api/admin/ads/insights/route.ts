import { NextResponse } from 'next/server'
import { getAdAccountInsights } from '@/lib/meta/marketing-api'
import { requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/insights
 *
 * Returns aggregate account-level insights for the stats header cards
 * and charts (spend, impressions, clicks, CTR, conversions).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-insights', windowSeconds: 60, maxRequests: 60 },
    })
    if ('response' in auth) return auth.response

    // ─── Fetch insights ──────────────────────────────────────────────────
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
    logError('Meta insights error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch insights' },
      { status: 500 },
    )
  }
}
