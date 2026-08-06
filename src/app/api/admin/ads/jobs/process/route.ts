import { NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { createClient } from '@supabase/supabase-js'
import { createMetaAdCampaign } from '@/lib/admin/meta-ads-service'
import { logError, logInfo } from '@/lib/logger'

export const runtime = 'nodejs'

const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
})

/**
 * POST /api/admin/ads/jobs/process
 *
 * QStash worker for asynchronous Meta ad campaign creation.
 * Receives jobs from QStash, verifies signature, and processes the campaign creation.
 */
export async function POST(request: Request) {
  // ─── Verify QStash signature ──────────────────────────────────────────
  const signature = request.headers.get('upstash-signature') || ''
  const body = await request.text()
  try {
    await qstashReceiver.verify({ signature, body })
  } catch {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  const payload = JSON.parse(body) as { jobId: string }
  const { jobId } = payload

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // ─── Load job ─────────────────────────────────────────────────────────
  const { data: job } = await supabase
    .from('meta_ad_campaign_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.status !== 'pending' && job.status !== 'processing') {
    return NextResponse.json({ error: 'Job already processed' }, { status: 409 })
  }

  // ─── Mark processing ──────────────────────────────────────────────────
  await supabase
    .from('meta_ad_campaign_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString(), attempts: job.attempts + 1 })
    .eq('id', jobId)

  try {
    const params = job.payload as Record<string, unknown>

    const resolvedParams = {
      categoryName: String(params.categoryName || '3D Printed Home Decor'),
      dailyBudgetPaise: Number(params.dailyBudgetPaise || 15000),
      siteUrl: String(params.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'),
      pageId: String(params.pageId || process.env.META_PAGE_ID || ''),
      createDpa: Boolean(params.createDpa ?? true),
      productLimit: Number(params.productLimit || 10),
    }

    if (!resolvedParams.pageId) {
      throw new Error('Missing Facebook Page ID')
    }

    // ─── Idempotency check ────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    const idempotencyKey = `${job.created_by}:${resolvedParams.categoryName}:${resolvedParams.dailyBudgetPaise}:${today}`
    const { data: existingRecord } = await supabase
      .from('meta_ad_campaigns')
      .select('id, campaign_id, created_at')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingRecord) {
      await supabase
        .from('meta_ad_campaign_jobs')
        .update({
          status: 'completed',
          result: { existingCampaignId: existingRecord.campaign_id, note: 'Idempotency hit — campaign already created today.' },
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      logInfo('Async meta ad job idempotency hit — skipping creation', {
        module: 'meta-ads',
        metadata: { jobId, existingCampaignId: existingRecord.campaign_id, idempotencyKey },
      })

      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        note: 'Campaign already exists for these settings today.',
        existingCampaignId: existingRecord.campaign_id,
      })
    }

    // ─── Create campaign via shared service ───────────────────────────────
    const result = await createMetaAdCampaign(supabase, resolvedParams, job.created_by)

    // ─── Mark completed ───────────────────────────────────────────────────
    await supabase
      .from('meta_ad_campaign_jobs')
      .update({
        status: 'completed',
        result: { carousel: result.carousel, dpa: result.dpa, productsUsed: result.cards.length },
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    logInfo('Async meta ad campaign creation completed', {
      module: 'meta-ads',
      metadata: { jobId, campaignId: result.carousel.campaignId },
    })

    return NextResponse.json({ success: true, jobId, status: 'completed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logError('Async meta ad campaign creation failed', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(message),
      metadata: { jobId },
    })

    const { data: currentJob } = await supabase
      .from('meta_ad_campaign_jobs')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single()

    const shouldRetry = (currentJob?.attempts ?? 1) < (currentJob?.max_attempts ?? 3)
    const nextStatus = shouldRetry ? 'pending' : 'failed'

    await supabase
      .from('meta_ad_campaign_jobs')
      .update({ status: nextStatus, error_message: message })
      .eq('id', jobId)

    // Return 500 so QStash retries if attempts remain
    return NextResponse.json(
      { error: message, jobId, status: nextStatus },
      { status: shouldRetry ? 500 : 200 },
    )
  }
}
