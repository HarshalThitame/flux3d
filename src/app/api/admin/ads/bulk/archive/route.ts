import { NextResponse } from 'next/server'
import { deleteCampaign } from '@/lib/meta/marketing-api'
import { BulkArchiveSchema } from '@/lib/admin/meta-ads-schemas'
import { validateBody, requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logMetaAdAudit } from '@/lib/admin/meta-ads-audit'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/admin/ads/bulk/archive
 *
 * Archives multiple campaigns in a single request.
 * Body: { ids: string[] }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-bulk-archive', windowSeconds: 60, maxRequests: 10 },
    })
    if ('response' in auth) return auth.response

    const { user, supabase } = auth

    // ─── Validate body ─────────────────────────────────────────────────────
    const rawBody = (await request.json().catch(() => ({}))) as unknown
    const validation = validateBody(BulkArchiveSchema, rawBody)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, issues: validation.issues }, { status: 400 })
    }

    const { ids } = validation.data

    // ─── Fetch local records for audit ─────────────────────────────────────
    const { data: localRecords } = await supabase
      .from('meta_ad_campaigns')
      .select('id, campaign_id, status')
      .in('campaign_id', ids)

    const localMap = new Map(
      (localRecords ?? []).map((r: Record<string, unknown>) => [r.campaign_id as string, r]),
    )

    // ─── Execute archives ──────────────────────────────────────────────────
    const results = await Promise.allSettled(
      ids.map((id) => deleteCampaign(id))
    )

    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    results.forEach((result, index) => {
      const id = ids[index]
      if (result.status === 'fulfilled') {
        succeeded.push(id)
      } else {
        failed.push({
          id,
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
        })
      }
    })

    // ─── Update local records ──────────────────────────────────────────────
    if (succeeded.length > 0) {
      await supabase
        .from('meta_ad_campaigns')
        .update({ status: 'ARCHIVED', updated_at: new Date().toISOString(), updated_by: user.id })
        .in('campaign_id', succeeded)

      for (const id of succeeded) {
        const local = localMap.get(id)
        if (local) {
          await logMetaAdAudit({
            campaignId: local.id as string,
            action: 'archive',
            performedBy: user.id,
            oldValue: { status: local.status },
            newValue: { status: 'ARCHIVED' },
            request,
          })
        }
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      succeeded,
      failed,
      total: ids.length,
    })
  } catch (err) {
    logError('Meta bulk archive error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to bulk archive campaigns' },
      { status: 500 },
    )
  }
}
