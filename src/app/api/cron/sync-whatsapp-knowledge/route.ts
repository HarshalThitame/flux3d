import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { syncWhatsAppKnowledgeChunks, syncProductKnowledgeChunks } from '@/lib/whatsapp-rag'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader.slice(7)),
      Buffer.from(cronSecret),
    )
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  if (!await verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if ((process.env.WHATSAPP_SYNC_ENABLED ?? 'true') === 'false') {
    return NextResponse.json({ success: true, skipped: true, reason: 'WHATSAPP_SYNC_ENABLED is false' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const startedAt = Date.now()
  const results: Record<string, unknown> = {}
  let overallSuccess = true

  // Sync seed knowledge chunks
  try {
    await syncWhatsAppKnowledgeChunks()
    results.seedSync = { status: 'success' }
  } catch (error) {
    results.seedSync = { status: 'failed', error: error instanceof Error ? error.message : String(error) }
    overallSuccess = false
  }

  // Sync product/material knowledge chunks
  try {
    const productResult = await syncProductKnowledgeChunks()
    results.productSync = { status: 'success', syncedCount: productResult.syncedCount }
  } catch (error) {
    results.productSync = { status: 'failed', error: error instanceof Error ? error.message : String(error) }
    overallSuccess = false
  }

  const duration = Date.now() - startedAt

  // Log sync to audit table
  try {
    await supabase.from('whatsapp_rag_answer_audits').insert({
      webhook_event_id: null,
      sender: null,
      user_id: null,
      question_text: '[SYNC]',
      retrieval_mode: 'none',
      retrieval_confidence: 0,
      retrieval_sources: [],
      response_kind: overallSuccess ? 'model' : 'error',
      response_text: JSON.stringify(results),
      response_metadata: { source: 'cron_sync', duration_ms: duration },
      fallback_reason: overallSuccess ? null : 'sync_failure',
      model_name: null,
      prompt_version: 'whatsapp-rag-v2',
      latency_ms: duration,
      retrieval_latency_ms: null,
      generation_latency_ms: null,
      session_history_length: null,
      structured_data_matches: null,
    })
  } catch (logError) {
    console.error('[cron] Failed to log sync audit:', logError)
  }

  return NextResponse.json({
    success: overallSuccess,
    results,
    durationMs: duration,
  })
}
