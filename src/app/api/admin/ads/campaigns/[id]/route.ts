import { NextRequest, NextResponse } from 'next/server'
import {
  getCampaignDetails,
  updateCampaignBudget,
  updateCampaignName,
  deleteCampaign,
} from '@/lib/meta/marketing-api'
import { EditCampaignSchema } from '@/lib/admin/meta-ads-schemas'
import { validateBody, requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logMetaAdAudit } from '@/lib/admin/meta-ads-audit'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/campaigns/[id]
 * Returns full campaign details with nested ad sets.
 *
 * PUT /api/admin/ads/campaigns/[id]
 * Body validated by EditCampaignSchema (Zod).
 *
 * DELETE /api/admin/ads/campaigns/[id]
 * Archives the campaign.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const auth = await requireMetaAdsAuth(request)
    if ('response' in auth) return auth.response

    const campaign = await getCampaignDetails(id)
    return NextResponse.json({ campaign })
  } catch (err) {
    logError('Meta campaign detail error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch campaign details' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-edit', windowSeconds: 60, maxRequests: 30 },
    })
    if ('response' in auth) return auth.response

    const { user, supabase } = auth

    // ─── Validate body ─────────────────────────────────────────────────────
    const rawBody = (await request.json().catch(() => ({}))) as unknown
    const validation = validateBody(EditCampaignSchema, rawBody)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, issues: validation.issues }, { status: 400 })
    }

    const { name, dailyBudgetPaise } = validation.data

    // ─── Fetch local record for audit ──────────────────────────────────────
    const { data: localRecord } = await supabase
      .from('meta_ad_campaigns')
      .select('id, name, daily_budget_paise')
      .eq('campaign_id', id)
      .maybeSingle()

    const oldValues: Record<string, unknown> = {}
    const newValues: Record<string, unknown> = {}

    if (typeof name === 'string') {
      await updateCampaignName(id, name)
      if (localRecord) {
        oldValues.name = localRecord.name
        newValues.name = name
      }
    }

    if (typeof dailyBudgetPaise === 'number') {
      await updateCampaignBudget(id, dailyBudgetPaise)
      if (localRecord) {
        oldValues.daily_budget_paise = localRecord.daily_budget_paise
        newValues.daily_budget_paise = dailyBudgetPaise
      }
    }

    // ─── Update local record if present ────────────────────────────────────
    if (localRecord) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id }
      if (typeof name === 'string') updates.name = name
      if (typeof dailyBudgetPaise === 'number') updates.daily_budget_paise = dailyBudgetPaise

      await supabase.from('meta_ad_campaigns').update(updates).eq('campaign_id', id)

      const action = name && dailyBudgetPaise !== undefined
        ? 'edit_budget'
        : name
          ? 'edit_name'
          : 'edit_budget'

      await logMetaAdAudit({
        campaignId: localRecord.id,
        action,
        performedBy: user.id,
        oldValue: oldValues,
        newValue: newValues,
        request,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError('Meta campaign update error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update campaign' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-delete', windowSeconds: 60, maxRequests: 10 },
    })
    if ('response' in auth) return auth.response

    const { user, supabase } = auth

    // ─── Fetch local record for audit ──────────────────────────────────────
    const { data: localRecord } = await supabase
      .from('meta_ad_campaigns')
      .select('id, status')
      .eq('campaign_id', id)
      .maybeSingle()

    await deleteCampaign(id)

    // ─── Soft-delete local record by marking archived ──────────────────────
    if (localRecord) {
      await supabase
        .from('meta_ad_campaigns')
        .update({ status: 'ARCHIVED', updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('campaign_id', id)

      await logMetaAdAudit({
        campaignId: localRecord.id,
        action: 'archive',
        performedBy: user.id,
        oldValue: { status: localRecord.status },
        newValue: { status: 'ARCHIVED' },
        request,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError('Meta campaign delete error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete campaign' },
      { status: 500 },
    )
  }
}
