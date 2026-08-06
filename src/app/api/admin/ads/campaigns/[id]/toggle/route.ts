import { NextRequest, NextResponse } from 'next/server'
import { updateCampaignStatus } from '@/lib/meta/marketing-api'
import { ToggleCampaignSchema } from '@/lib/admin/meta-ads-schemas'
import { validateBody, requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logMetaAdAudit } from '@/lib/admin/meta-ads-audit'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/admin/ads/campaigns/[id]/toggle
 *
 * Toggles campaign status between ACTIVE and PAUSED.
 * Body validated by ToggleCampaignSchema (Zod).
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-toggle', windowSeconds: 60, maxRequests: 30 },
    })
    if ('response' in auth) return auth.response

    const { user, supabase } = auth

    // ─── Validate body ─────────────────────────────────────────────────────
    const rawBody = (await request.json().catch(() => ({}))) as unknown
    const validation = validateBody(ToggleCampaignSchema, rawBody)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, issues: validation.issues }, { status: 400 })
    }

    const { status } = validation.data

    // ─── Fetch local record for audit old value ────────────────────────────
    const { data: localRecord } = await supabase
      .from('meta_ad_campaigns')
      .select('id, status')
      .eq('campaign_id', id)
      .maybeSingle()

    // ─── Toggle status ─────────────────────────────────────────────────────
    await updateCampaignStatus(id, status)

    // ─── Update local record if present ────────────────────────────────────
    if (localRecord) {
      await supabase
        .from('meta_ad_campaigns')
        .update({ status, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('campaign_id', id)

      await logMetaAdAudit({
        campaignId: localRecord.id,
        action: 'toggle',
        performedBy: user.id,
        oldValue: { status: localRecord.status },
        newValue: { status },
        request,
      })
    }

    return NextResponse.json({ success: true, status })
  } catch (err) {
    logError('Meta campaign toggle error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to toggle campaign status',
      },
      { status: 500 },
    )
  }
}
