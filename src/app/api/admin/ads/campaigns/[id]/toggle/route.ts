import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { updateCampaignStatus } from '@/lib/meta/marketing-api'

export const runtime = 'nodejs'

/**
 * POST /api/admin/ads/campaigns/[id]/toggle
 *
 * Toggles campaign status between ACTIVE and PAUSED.
 * Body: { status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }
 */

export async function POST(
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
    const status = body.status as 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | undefined

    if (!status || !['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Use ACTIVE, PAUSED, or ARCHIVED.' },
        { status: 400 },
      )
    }

    // ─── Toggle status ─────────────────────────────────────────────────────
    await updateCampaignStatus(id, status)

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('Meta campaign toggle error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to toggle campaign status',
      },
      { status: 500 },
    )
  }
}
