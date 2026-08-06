import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CreateCampaignSchema } from '@/lib/admin/meta-ads-schemas'
import { validateBody } from '@/lib/admin/meta-ads-route'
import { getQStashClient } from '@/lib/email/qstash'
import { rateLimitResponse } from '@/lib/rate-limit'
import { logError, logInfo } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/admin/ads/create-async
 *
 * Enqueues a Meta ad campaign creation job via QStash.
 * Returns immediately with a jobId that the frontend can poll.
 *
 * Body: Same as /api/admin/ads/create (validated by CreateCampaignSchema)
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Rate limit ───────────────────────────────────────────────────────
    const rl = await rateLimitResponse(request, {
      prefix: 'meta-ads-create-async',
      windowSeconds: 60,
      maxRequests: 5,
    })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      )
    }

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

    // ─── Validate body ───────────────────────────────────────────────────
    const rawBody = (await request.json().catch(() => ({}))) as unknown
    const validation = validateBody(CreateCampaignSchema, rawBody)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, issues: validation.issues }, { status: 400 })
    }

    // ─── Insert job record ────────────────────────────────────────────────
    const { data: job, error: jobError } = await supabase
      .from('meta_ad_campaign_jobs')
      .insert({
        payload: validation.data,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // ─── Enqueue to QStash ──────────────────────────────────────────────
    try {
      const qstash = getQStashClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'
      await qstash.publishJSON({
        url: `${siteUrl}/api/admin/ads/jobs/process`,
        body: { jobId: job.id },
        retries: 2,
      })

      logInfo('Meta ad campaign creation job enqueued', {
        module: 'meta-ads',
        metadata: { jobId: job.id, userId: user.id },
      })
    } catch (qstashErr) {
      logError('QStash enqueue failed for meta ad job', {
        module: 'meta-ads',
        error: qstashErr instanceof Error ? qstashErr : new Error(String(qstashErr)),
        metadata: { jobId: job.id },
      })
      // Mark job as failed since we couldn't enqueue it
      await supabase
        .from('meta_ad_campaign_jobs')
        .update({ status: 'failed', error_message: 'QStash enqueue failed' })
        .eq('id', job.id)
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'pending',
      pollUrl: `/api/admin/ads/jobs/${job.id}`,
    })
  } catch (err) {
    logError('Meta ad async creation error', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to enqueue campaign creation' },
      { status: 500 },
    )
  }
}
