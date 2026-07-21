import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TABLES_TO_CHECK = [
  'whatsapp_messages',
  'whatsapp_webhook_events',
  'whatsapp_knowledge_chunks',
  'whatsapp_rag_answer_audits',
]

const FUNCTIONS_TO_CHECK = [
  'match_whatsapp_knowledge_chunks',
]

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const status: Record<string, boolean | string> = {}

  for (const table of TABLES_TO_CHECK) {
    const { data, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).limit(0).maybeSingle()
    status[table] = error ? `Missing: ${error.message}` : true
  }

  for (const fn of FUNCTIONS_TO_CHECK) {
    const { data, error } = await supabase.rpc(fn, {
      query_embedding: JSON.stringify([0]),
      match_threshold: 0,
      match_count: 1,
    })
    status[fn] = error ? `Missing: ${error.message}` : Boolean(data)
  }

  const missing = Object.entries(status).filter(([, v]) => v !== true).length
  const ok = Object.entries(status).filter(([, v]) => v === true).length

  return NextResponse.json({
    summary: `${ok} found, ${missing} missing`,
    details: status,
    help: missing > 0
      ? 'Run the SQL files in supabase/migrations/ via the Supabase SQL editor to create missing tables/functions.'
      : 'All tables and functions exist.',
  })
}
