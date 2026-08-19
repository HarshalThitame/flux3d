import { NextResponse } from 'next/server'
import { requireMetaAdsAuth } from '@/lib/admin/meta-ads-route'
import { logError } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/ads/jobs/[id]
 *
 * Returns the status of an async campaign creation job.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params

    const auth = await requireMetaAdsAuth(request, {
      rateLimit: { prefix: 'meta-ads-job-status', windowSeconds: 60, maxRequests: 120 },
    })
    if ('response' in auth) return auth.response as Response

    const { supabase } = auth

    // ─── Fetch job ────────────────────────────────────────────────────────
    const { data: job, error } = await supabase
      .from('meta_ad_campaign_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      payload: job.payload,
      result: job.result,
      error_message: job.error_message,
      attempts: job.attempts,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
    })
  } catch (err) {
    logError('Meta ad job status error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch job status' },
      { status: 500 },
    )
  }
}
