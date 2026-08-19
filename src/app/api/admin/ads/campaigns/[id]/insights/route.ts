import { NextResponse } from 'next/server'
import { getCampaignInsightsTimeSeries } from '@/lib/meta/marketing-api'
import { requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/campaigns/[id]/insights
 *
 * Returns 7-day time-series insights for a specific campaign.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params

    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-campaign-insights', windowSeconds: 60, maxRequests: 60 },
    })
    if ('response' in auth) return auth.response as Response

    const insights = await getCampaignInsightsTimeSeries(id, 7)

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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const [dayA, monA] = a.label.split(' ')
        const [dayB, monB] = b.label.split(' ')
        const monthDiff = months.indexOf(monA) - months.indexOf(monB)
        if (monthDiff !== 0) return monthDiff
        return Number(dayA) - Number(dayB)
      })

    return NextResponse.json({ campaignId: id, points })
  } catch (err) {
    logError('Meta campaign insights error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch campaign insights' },
      { status: 500 },
    )
  }
}
