import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_SYSTEM_USER_TOKEN?.trim()
const wabaId = process.env.WHATSAPP_WABA_ID?.trim()
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
const appId = process.env.META_APP_ID?.trim()
const businessId = process.env.META_BUSINESS_ID?.trim()
const flowId = process.env.WHATSAPP_ADDRESS_FLOW_ID?.trim()
const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0'

const AUTH = { headers: { Authorization: 'Bearer ' + token } }

let pass = 0, fail = 0, warn = 0
const out = []
function line(sym, msg) {
  out.push('  ' + sym + ' ' + msg)
  if (sym === 'OK') pass++
  else if (sym === 'WARN') warn++
  else fail++
}
function section(title) {
  out.push('')
  out.push('=== ' + title + ' ===')
}

async function api(url) {
  const res = await fetch(url, AUTH)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function main() {
  console.log('WhatsApp Infrastructure Diagnostics\n')
  console.log('Environment:')
  console.log('  Token:     ' + (token ? 'set (' + token.length + ' chars)' : 'MISSING'))
  console.log('  WABA:      ' + (wabaId || 'MISSING'))
  console.log('  Phone ID:  ' + (phoneNumberId || 'MISSING'))
  console.log('  App ID:    ' + (appId || 'MISSING'))
  console.log('  Business:  ' + (businessId || 'MISSING'))
  console.log('  Flow ID:   ' + (flowId || 'MISSING'))
  console.log('  API ver:   ' + apiVersion)
  console.log('')

  section('1. Business verification')
  if (businessId) {
    const b = await api('https://graph.facebook.com/' + apiVersion + '/' + businessId + '?fields=name,id,verification_status')
    if (b.ok) line('OK', 'Business "' + (b.data.name || '?') + '" verification: ' + (b.data.verification_status || 'unknown'))
    else line('FAIL', 'Business query: ' + (b.data?.error?.message || b.status))
  } else {
    line('WARN', 'META_BUSINESS_ID not set')
  }

  section('2. WABA + phone')
  if (wabaId) {
    const w = await api('https://graph.facebook.com/' + apiVersion + '/' + wabaId + '?fields=name,id,account_review_status,business_verification_status')
    if (w.ok) {
      line('OK', 'WABA review: ' + (w.data.account_review_status || 'unknown'))
      line('OK', 'WABA biz verification: ' + (w.data.business_verification_status || 'unknown'))
    } else line('FAIL', 'WABA query: ' + (w.data?.error?.message || w.status))
  }
  if (phoneNumberId) {
    const p = await api('https://graph.facebook.com/' + apiVersion + '/' + phoneNumberId + '?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status')
    if (p.ok) {
      line('OK', 'Phone: ' + (p.data.display_phone_number || '?') + ' status=' + (p.data.status || '?') + ' quality=' + (p.data.quality_rating || '?'))
      if (p.data.code_verification_status === 'VERIFIED') line('OK', 'Code verification: ' + p.data.code_verification_status)
      else line('FAIL', 'Code verification: ' + p.data.code_verification_status + ' (run scripts/verify-phone.mjs)')
    } else line('FAIL', 'Phone query: ' + (p.data?.error?.message || p.status))
  }

  section('3. Message templates')
  if (wabaId) {
    const t = await api('https://graph.facebook.com/' + apiVersion + '/' + wabaId + '/message_templates?fields=name,status,id,category&limit=100')
    if (t.ok) {
      const rows = t.data.data || []
      const approved = rows.filter(r => r.status === 'APPROVED').length
      const pending = rows.filter(r => r.status === 'PENDING').length
      const rejected = rows.filter(r => r.status === 'REJECTED').length
      line('OK', rows.length + ' templates: ' + approved + ' approved, ' + pending + ' pending, ' + rejected + ' rejected')
      const expected = {
        WHATSAPP_TEMPLATE_ORDER_SHIPPED: 'flux3d_order_shipped',
        WHATSAPP_TEMPLATE_ORDER_DELIVERED: 'flux3d_order_delivered',
        WHATSAPP_TEMPLATE_ORDER_CONFIRMATION: 'flux3d_order_confirmation',
        WHATSAPP_TEMPLATE_PAYMENT_LINK: 'flux3d_payment_link',
        WHATSAPP_TEMPLATE_CONNECTED: 'flux3d_account_linked',
      }
      for (const [envKey, name] of Object.entries(expected)) {
        const configured = process.env[envKey]?.trim() || name
        const row = rows.find(r => r.name === configured)
        if (!row) {
          line('FAIL', envKey + ' -> "' + configured + '" not found on WABA')
        } else if (row.status === 'APPROVED') {
          line('OK', envKey + ' -> ' + configured + ' (APPROVED)')
        } else if (row.status === 'REJECTED') {
          line('FAIL', envKey + ' -> ' + configured + ' (REJECTED)')
        } else {
          line('WARN', envKey + ' -> ' + configured + ' (still ' + row.status + ')')
        }
      }
      if (process.env.WHATSAPP_AUTH_TEMPLATE_NAME) {
        const auth = rows.find(r => r.name === process.env.WHATSAPP_AUTH_TEMPLATE_NAME)
        if (auth) line(auth.status === 'APPROVED' ? 'OK' : 'WARN', 'WHATSAPP_AUTH_TEMPLATE_NAME -> ' + auth.name + ' (' + auth.status + ')')
        else line('WARN', 'WHATSAPP_AUTH_TEMPLATE_NAME -> ' + process.env.WHATSAPP_AUTH_TEMPLATE_NAME + ' not found')
      }
    } else line('FAIL', 'Template query: ' + (t.data?.error?.message || t.status))
  }

  section('4. Address flow')
  if (flowId) {
    const f = await api('https://graph.facebook.com/' + apiVersion + '/' + flowId + '?fields=id,name,status,validation_errors')
    if (f.ok) {
      line(f.data.status === 'PUBLISHED' ? 'OK' : 'WARN', 'Flow "' + (f.data.name || '?') + '" status: ' + (f.data.status || 'unknown'))
      const ve = f.data.validation_errors || []
      if (ve.length) line('FAIL', 'Validation errors: ' + JSON.stringify(ve))
    } else line('FAIL', 'Flow query: ' + (f.data?.error?.message || f.status))
  } else {
    line('WARN', 'WHATSAPP_ADDRESS_FLOW_ID not set')
  }

  section('5. Runtime env wiring')
  const required = ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WEBHOOK_SECRET', 'WHATSAPP_VERIFY_TOKEN']
  for (const key of required) {
    if (process.env[key]) line('OK', key + ' set')
    else line('FAIL', key + ' MISSING')
  }
  const ordering = process.env.WHATSAPP_ORDERING_ENABLED
  line(ordering === 'false' ? 'WARN' : 'OK', 'WHATSAPP_ORDERING_ENABLED = ' + (ordering || 'true (default)'))
  line((process.env.WHATSAPP_ADDRESS_FLOW_ID ? 'OK' : 'WARN'), 'WHATSAPP_ADDRESS_FLOW_ID = ' + (process.env.WHATSAPP_ADDRESS_FLOW_ID || 'not set - text fallback active'))

  console.log(out.join('\n'))
  console.log('\n----------------------------------------')
  console.log('RESULT: ' + pass + ' OK, ' + warn + ' WARN, ' + fail + ' FAIL')
  if (fail > 0) process.exitCode = 1
}

main().catch((err) => { console.error(err); process.exit(1) })
