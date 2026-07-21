import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const checks: Record<string, string | boolean> = {}

  // Check required env vars
  checks['WHATSAPP_PHONE_NUMBER_ID'] = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) || '❌ Missing'
  checks['WHATSAPP_ACCESS_TOKEN'] = Boolean(process.env.WHATSAPP_ACCESS_TOKEN) || '❌ Missing'
  checks['WHATSAPP_VERIFY_TOKEN'] = Boolean(process.env.WHATSAPP_VERIFY_TOKEN) || '❌ Missing'
  checks['OPENAI_API_KEY'] = Boolean(process.env.OPENAI_API_KEY) || '❌ Missing'
  checks['WHATSAPP_REPLY_TO_ALL'] = process.env.WHATSAPP_REPLY_TO_ALL ?? 'Not set (defaults to true)'

  // Check Supabase tables
  try {
    const supabase = createAdminSupabaseClient()

    const tables = ['whatsapp_messages', 'whatsapp_webhook_events', 'whatsapp_knowledge_chunks', 'whatsapp_rag_answer_audits']
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id', { count: 'exact', head: true }).limit(0)
      checks[`table:${table}`] = error ? `❌ ${error.message}` : true
    }

    // Check profiles table has phone_number column
    const { error: profileError } = await supabase.from('profiles').select('phone_number').limit(1)
    checks['table:profiles.phone_number'] = profileError ? `⚠️ ${profileError.message}` : true

  } catch (err) {
    checks['supabase_connection'] = `❌ ${err instanceof Error ? err.message : String(err)}`
  }

  const allOk = Object.values(checks).every((v) => v === true)
  return NextResponse.json({ status: allOk ? '✅ All checks passed' : '⚠️ Some checks failed', checks })
}
