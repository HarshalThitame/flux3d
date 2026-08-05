import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { listCampaigns, type MetaCampaign } from '@/lib/meta/marketing-api'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/list
 *
 * Returns Meta campaigns for this ad account, enriched with any
 * locally persisted records from meta_ad_campaigns.
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

    // ─── Fetch from Meta ──────────────────────────────────────────────────
    const campaigns = await listCampaigns()

    // ─── Enrich with local DB records ─────────────────────────────────────
    const campaignIds = campaigns.map((c: MetaCampaign) => c.id)
    const { data: localRecords } = await supabase
      .from('meta_ad_campaigns')
      .select('*')
      .in('campaign_id', campaignIds)

    const localMap = new Map(
      (localRecords ?? []).map((r: Record<string, unknown>) => [r.campaign_id, r]),
    )

    const enriched = campaigns.map((c: MetaCampaign) => {
      const local = localMap.get(c.id)
      return {
        ...c,
        local_record: local ?? null,
        has_local_record: !!local,
      }
    })

    return NextResponse.json({
      campaigns: enriched,
      total: enriched.length,
    })
  } catch (err) {
    console.error('Meta ad list error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to list campaigns',
      },
      { status: 500 },
    )
  }
}
