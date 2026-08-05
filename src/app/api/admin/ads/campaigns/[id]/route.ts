import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  getCampaignDetails,
  updateCampaignBudget,
  updateCampaignName,
  deleteCampaign,
} from '@/lib/meta/marketing-api'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/campaigns/[id]
 * Returns full campaign details with nested ad sets.
 *
 * PUT /api/admin/ads/campaigns/[id]
 * Body: { name?: string, dailyBudgetPaise?: number }
 *
 * DELETE /api/admin/ads/campaigns/[id]
 * Archives the campaign.
 */

export async function GET(
  _request: NextRequest,
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

    // ─── Fetch campaign details ──────────────────────────────────────────
    const campaign = await getCampaignDetails(id)

    return NextResponse.json({ campaign })
  } catch (err) {
    console.error('Meta campaign detail error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to fetch campaign details',
      },
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

    // ─── Parse body ────────────────────────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (typeof body.name === 'string') {
      await updateCampaignName(id, body.name)
    }

    if (typeof body.dailyBudgetPaise === 'number') {
      await updateCampaignBudget(id, body.dailyBudgetPaise)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Meta campaign update error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to update campaign',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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

    // ─── Delete campaign ───────────────────────────────────────────────────
    await deleteCampaign(id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Meta campaign delete error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to delete campaign',
      },
      { status: 500 },
    )
  }
}
