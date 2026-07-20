'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '../../types/database'

export type WhatsAppRagAuditRecord = {
  webhook_event_id: string | null
  sender: string | null
  user_id: string | null
  question_text: string
  retrieval_mode: 'database' | 'seed' | 'none'
  retrieval_confidence: number
  retrieval_sources: Array<{
    sourceKey: string
    title: string
    score: number
    content?: string
  }>
  response_kind: 'model' | 'fallback' | 'error'
  response_text: string | null
  response_metadata: Record<string, unknown>
  fallback_reason: string | null
  model_name: string | null
  prompt_version: string
  latency_ms: number | null
  retrieval_latency_ms: number | null
  generation_latency_ms: number | null
}

function normalizeJson(value: unknown): Json | null {
  if (value === undefined || value === null) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Json
  } catch {
    return null
  }
}

export async function logWhatsAppRagAudit(record: WhatsAppRagAuditRecord) {
  if (!record.question_text.trim()) return

  const supabase = createAdminClient()
  await supabase.from('whatsapp_rag_answer_audits').insert({
    webhook_event_id: record.webhook_event_id,
    sender: record.sender,
    user_id: record.user_id,
    question_text: record.question_text.slice(0, 8000),
    retrieval_mode: record.retrieval_mode,
    retrieval_confidence: record.retrieval_confidence,
    retrieval_sources: normalizeJson(record.retrieval_sources) ?? [],
    response_kind: record.response_kind,
    response_text: record.response_text?.slice(0, 8000) ?? null,
    response_metadata: normalizeJson(record.response_metadata) ?? {},
    fallback_reason: record.fallback_reason?.slice(0, 512) ?? null,
    model_name: record.model_name?.slice(0, 128) ?? null,
    prompt_version: record.prompt_version.slice(0, 64),
    latency_ms: record.latency_ms,
    retrieval_latency_ms: record.retrieval_latency_ms,
    generation_latency_ms: record.generation_latency_ms,
  })
}
