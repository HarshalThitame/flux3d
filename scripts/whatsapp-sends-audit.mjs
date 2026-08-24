// WhatsApp template send audit — enterprise observability for HSM usage.
//
// Cross-references:
//   1. Meta-approved templates on the WABA (Graph API)
//   2. Actual template sends in the last 24h (whatsapp_messages where media_type='template')
//
// Flags any APPROVED template with zero sends — the "wired but silent" failure mode.
//
// Usage: node scripts/whatsapp-sends-audit.mjs
// Env: WHATSAPP_WABA_ID, WHATSAPP_ACCESS_TOKEN, and Supabase service key via
//      SUPABASE_SECRET_KEY (or NEXT_PUBLIC_SUPABASE_URL + key) — read from env or .env.local.

try {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })
} catch {
  // CI / bare environments: rely on real environment variables.
}

const wabaId = process.env.WHATSAPP_WABA_ID?.trim()
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_SYSTEM_USER_TOKEN?.trim()
const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!wabaId || !token) {
  console.error('Missing WHATSAPP_WABA_ID / WHATSAPP_ACCESS_TOKEN')
  process.exit(1)
}
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL / service key (SUPABASE_SECRET_KEY)')
  process.exit(1)
}

async function main() {
  // 1. Approved templates from Meta
  const tplRes = await fetch(
    `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?fields=name,status&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const tplData = await tplRes.json().catch(() => ({ data: [] }))
  const templates = Array.isArray(tplData.data) ? tplData.data : []
  const approved = templates.filter((t) => t.status === 'APPROVED')

  console.log(`Approved templates on WABA: ${approved.length}\n`)

  // 2. Sends in last 24h grouped by trigger_event
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const sendRes = await fetch(
    `${supabaseUrl}/rest/v1/whatsapp_messages?select=trigger_event,status&media_type=eq.template&created_at=gte.${since}`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )
  if (!sendRes.ok) {
    console.error('Supabase query failed:', sendRes.status, await sendRes.text())
    process.exit(1)
  }
  const sends = await sendRes.json()

  const byEvent = {}
  for (const s of sends) {
    const key = s.trigger_event || 'unknown'
    byEvent[key] = byEvent[key] || { total: 0, failed: 0 }
    byEvent[key].total++
    if (s.status === 'failed') byEvent[key].failed++
  }

  // Map templates to their lifecycle trigger_event (mirrors notifications.ts).
  const eventByTemplate = {
    flux3d_order_shipped: 'order_shipped',
    flux3d_order_delivered: 'order_delivered',
    flux3d_order_confirmation: 'order_confirmed',
    flux3d_payment_link: 'payment_link',
    flux3d_account_linked: 'account_connected',
  }

  let flagged = 0
  console.log('Template usage (last 24h):')
  for (const t of approved) {
    if (t.name === 'hello_world') continue
    const ev = eventByTemplate[t.name]
    if (!ev) continue
    const stats = byEvent[ev] || { total: 0, failed: 0 }
    const marker = stats.total === 0 ? '⚠️  ZERO SENDS' : stats.failed > 0 ? `⚠️  ${stats.failed} FAILED` : '✅'
    if (stats.total === 0 || stats.failed > 0) flagged++
    console.log(`  ${t.name.padEnd(28)} sent=${String(stats.total).padStart(4)}  ${marker}`)
  }

  console.log('\nOther template traffic:')
  const knownEvents = new Set(Object.values(eventByTemplate))
  let other = false
  for (const [ev, stats] of Object.entries(byEvent)) {
    if (!knownEvents.has(ev)) {
      other = true
      console.log(`  ${ev.padEnd(28)} sent=${stats.total}`)
    }
  }
  if (!other) console.log('  (none)')

  console.log(`\nRESULT: ${flagged === 0 ? 'ALL WIRED TEMPLATES ACTIVE' : `${flagged} template(s) need attention`}`)
  if (flagged > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
