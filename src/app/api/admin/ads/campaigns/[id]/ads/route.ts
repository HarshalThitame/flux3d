import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { listAds } from '@/lib/meta/marketing-api'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/campaigns/[adset_id]/ads
 *
 * Returns ads for a given ad set ID.
 * Note: The route segment is [id] but we treat it as adset_id for ads listing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: adSetId } = await params
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

    // ─── Fetch ads ─────────────────────────────────────────────────────────
    const ads = await listAds(adSetId)

    return NextResponse.json({ ads })
  } catch (err) {
    console.error('Meta ads list error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to list ads',
      },
      { status: 500 },
    )
  }
}
