import { NextResponse } from 'next/server'
import { getAdAccountInsightsTimeSeries } from '@/lib/meta/marketing-api'
import { requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/time-series
 *
 * Returns real daily time-series insights for the ad account
 * (spend, impressions, clicks) over the last 7 days.
 * Used to power the InsightsChart with actual data instead of mocked averages.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-time-series', windowSeconds: 60, maxRequests: 60 },
    })
    if ('response' in auth) return auth.response

    // ─── Fetch time-series insights ────────────────────────────────────────
    const insights = await getAdAccountInsightsTimeSeries(7)

    // Normalize to chart-friendly points
    const points = insights
      .filter((i) => i.date_start)
      .map((i) => {
        const d = new Date(i.date_start!)
        return {
          label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          spend: Number(i.spend) || 0,
          impressions: Number(i.impressions) || 0,
          clicks: Number(i.clicks) || 0,
        }
      })
      .sort((a, b) => {
        // Sort chronologically by label (day month)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const [dayA, monA] = a.label.split(' ')
        const [dayB, monB] = b.label.split(' ')
        const monthDiff = months.indexOf(monA) - months.indexOf(monB)
        if (monthDiff !== 0) return monthDiff
        return Number(dayA) - Number(dayB)
      })

    return NextResponse.json({ points })
  } catch (err) {
    logError('Meta time-series error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch time-series insights' },
      { status: 500 },
    )
  }
}
