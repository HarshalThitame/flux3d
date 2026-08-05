import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCampaignInsightsTimeSeries } from '@/lib/meta/marketing-api'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/campaigns/[id]/insights
 *
 * Returns daily time-series insights for the given campaign
 * (spend, impressions, clicks) over the last 7 days.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
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

    // ─── Fetch time-series insights ────────────────────────────────────────
    const insights = await getCampaignInsightsTimeSeries(id, 7)

    return NextResponse.json({ insights })
  } catch (err) {
    console.error('Meta campaign time-series error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to fetch time-series insights',
      },
      { status: 500 },
    )
  }
}
