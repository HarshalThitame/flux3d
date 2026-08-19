import { NextResponse } from 'next/server'
import { listAds } from '@/lib/meta/marketing-api'
import { requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/campaigns/[adset_id]/ads
 *
 * Returns ads for a given ad set ID.
 * Note: The route segment is [id] but we treat it as adset_id for ads listing.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id: adSetId } = await params

    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-ads-list', windowSeconds: 60, maxRequests: 60 },
    })
    if ('response' in auth) return auth.response as Response

    const ads = await listAds(adSetId)
    return NextResponse.json({ ads })
  } catch (err) {
    logError('Meta ads list error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list ads' },
      { status: 500 },
    )
  }
}
