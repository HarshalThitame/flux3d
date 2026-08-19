import { NextResponse } from 'next/server'
import { listCampaigns, type MetaCampaign } from '@/lib/meta/marketing-api'
import { requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/list
 *
 * Returns Meta campaigns for this ad account, enriched with any
 * locally persisted records from meta_ad_campaigns.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-list', windowSeconds: 60, maxRequests: 60 },
    })
    if ('response' in auth) return auth.response as Response

    const { supabase } = auth

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
    logError('Meta ad list error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list campaigns' },
      { status: 500 },
    )
  }
}
