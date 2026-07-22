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

  checks['WHATSAPP_SESSION_TURNS'] = process.env.WHATSAPP_SESSION_TURNS ?? 'Not set (defaults to 4)'
  checks['WHATSAPP_STRUCTURED_DATA_ENABLED'] = process.env.WHATSAPP_STRUCTURED_DATA_ENABLED ?? 'Not set (defaults to true)'

  // Check Supabase tables
  try {
    const supabase = createAdminSupabaseClient()

    const tables = ['whatsapp_messages', 'whatsapp_webhook_events', 'whatsapp_knowledge_chunks', 'whatsapp_rag_answer_audits', 'whatsapp_sessions']
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id', { count: 'exact', head: true }).limit(0)
      checks[`table:${table}`] = error ? `❌ ${error.message}` : true
    }

    // Check profiles table has phone_number column
    const { error: profileError } = await supabase.from('profiles').select('phone_number').limit(1)
    checks['table:profiles.phone_number'] = profileError ? `⚠️ ${profileError.message}` : true

    // Check last knowledge sync time
    const { data: lastSync } = await supabase
      .from('whatsapp_rag_answer_audits')
      .select('created_at, response_text, response_kind')
      .eq('question_text', '[SYNC]')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSync) {
      checks['last_knowledge_sync'] = lastSync.created_at
      checks['last_sync_result'] = lastSync.response_kind === 'model' ? '✅ Success' : `❌ Failed`
    } else {
      checks['last_knowledge_sync'] = '⚠️ Never synced'
    }

  } catch (err) {
    checks['supabase_connection'] = `❌ ${err instanceof Error ? err.message : String(err)}`
  }

  // Test WhatsApp API connectivity
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    if (phoneNumberId && accessToken) {
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0'
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (response.ok) {
        const data = await response.json()
        checks['whatsapp_api_test'] = `✅ Connected (${data.display_phone_number || data.id || 'OK'})`
      } else {
        const text = await response.text().catch(() => 'Unknown error')
        checks['whatsapp_api_test'] = `❌ HTTP ${response.status}: ${text.slice(0, 100)}`
      }
    } else {
      checks['whatsapp_api_test'] = '⚠️ Skipped (missing env vars)'
    }
  } catch (err) {
    checks['whatsapp_api_test'] = `❌ ${err instanceof Error ? err.message : String(err)}`
  }

  const allOk = Object.values(checks).every((v) => v === true)
  return NextResponse.json({ status: allOk ? '✅ All checks passed' : '⚠️ Some checks failed', checks })
}
