import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getUptimeSeconds } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function checkDatabase(): Promise<{ ok: boolean; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return { ok: false, error: 'Missing configuration' }

  try {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase.from('materials').select('id').limit(1).maybeSingle()
    return { ok: !error, error: error ? error.message : null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

async function checkOpenAI(): Promise<{ ok: boolean; error: string | null }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'Missing OPENAI_API_KEY' }

  try {
    const openai = new OpenAI({ apiKey })
    await openai.models.retrieve(process.env.WHATSAPP_EMBEDDING_MODEL || 'text-embedding-3-small')
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

async function checkWhatsAppApi(): Promise<{ ok: boolean; error: string | null }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return { ok: false, error: 'Missing WhatsApp config' }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v22.0'}/${phoneNumberId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    return { ok: response.ok, error: response.ok ? null : `HTTP ${response.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

async function checkRagMode(): Promise<{ mode: 'database' | 'seed' | 'empty'; count: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return { mode: 'empty', count: 0 }

  try {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { count, error } = await supabase
      .from('whatsapp_knowledge_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
    if (error) return { mode: 'empty', count: 0 }
    return { mode: count && count > 0 ? 'database' : 'seed', count: count ?? 0 }
  } catch {
    return { mode: 'empty', count: 0 }
  }
}

async function checkSupabaseRpc(): Promise<{ ok: boolean; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return { ok: false, error: 'Missing configuration' }

  try {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase.rpc('match_whatsapp_knowledge_chunks', {
      query_embedding: JSON.stringify(new Array(1536).fill(0)),
      match_threshold: 0,
      match_count: 1,
    })
    return { ok: !error, error: error ? error.message : null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'RPC unavailable' }
  }
}

export async function GET() {
  const started = Date.now()

  const [db, openai, whatsapp, rpc, rag] = await Promise.all([
    checkDatabase(),
    checkOpenAI(),
    checkWhatsAppApi(),
    checkSupabaseRpc(),
    checkRagMode(),
  ])

  const allOk = db.ok && openai.ok && whatsapp.ok && rpc.ok
  const duration = Date.now() - started

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      uptime: getUptimeSeconds(),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: db,
        openai,
        whatsapp: whatsapp,
        supabaseRagRpc: rpc,
      },
      ragMode: rag.mode === 'database'
        ? `active (${rag.count} chunks)`
        : rag.mode === 'seed'
          ? 'fallback (seed data — run sync-whatsapp-knowledge)'
          : 'unavailable',
      duration,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
