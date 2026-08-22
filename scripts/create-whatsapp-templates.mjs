import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Optional local-env loader. In CI, secrets arrive as real environment
// variables; dotenv stays a devDependency so it is loaded dynamically and
// silently skipped when unavailable.
try {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })
} catch {
  // dotenv not installed — proceed with process.env only
}


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const ENV_LOCAL_PATH = path.join(root, '.env.local')

const wabaId = process.env.WHATSAPP_WABA_ID?.trim()
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_SYSTEM_USER_TOKEN?.trim()
const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0'

if (!wabaId || !token) {
  console.error('Missing WHATSAPP_WABA_ID or WHATSAPP_ACCESS_TOKEN / META_SYSTEM_USER_TOKEN.')
  console.error('Set these in your .env.local or environment before running this script.')
  process.exit(1)
}

const BASE_URL = 'https://graph.facebook.com/' + apiVersion + '/' + wabaId + '/message_templates'

// Enterprise template catalogue — all bodies comply with Meta template rules:
// no leading/trailing variables, parameter:word ratio within limits.
const templates = [
  {
    name: 'flux3d_order_shipped',
    category: 'UTILITY',
    language: 'en_IN',
    body: 'Your order {{1}} has been shipped via {{2}}. Your tracking number is {{3}}. You can track your shipment using the tracking number provided.',
    examples: ['ORD-12345', 'FedEx', 'TRK123456'],
  },
  {
    name: 'flux3d_order_delivered',
    category: 'UTILITY',
    language: 'en_IN',
    body: 'Your order {{1}} has been delivered. Thank you for choosing Flux3D.',
    examples: ['ORD-12345'],
  },
  {
    name: 'flux3d_order_confirmation',
    category: 'UTILITY',
    language: 'en_IN',
    body: 'We are pleased to confirm that your order {{1}} has been successfully placed and is now being processed. The total amount for your order is {{2}}. You will receive further updates as your order progresses through our fulfilment stages.',
    examples: ['ORD-12345', 'Rs. 1,499.00'],
  },
  {
    name: 'flux3d_payment_link',
    category: 'UTILITY',
    language: 'en_IN',
    body: 'Please complete the payment for your order {{1}} by visiting this secure link: {{2}}. Once the payment is confirmed, we will begin processing your order immediately.',
    examples: ['ORD-12345', 'https://flux3d.in/pay/abc123'],
  },
  {
    name: 'flux3d_account_linked',
    category: 'UTILITY',
    language: 'en_IN',
    body: 'Hi {{1}}, your WhatsApp number has been linked to your Flux3D account. You now have {{2}} order(s) available to track.',
    examples: ['Rutik', '3'],
  },
  {
    name: 'flux3d_auth_otp',
    category: 'AUTHENTICATION',
    language: 'en_IN',
    auth: true,
  },
]

const ENV_MAP = {
  flux3d_order_shipped: 'WHATSAPP_TEMPLATE_ORDER_SHIPPED',
  flux3d_order_delivered: 'WHATSAPP_TEMPLATE_ORDER_DELIVERED',
  flux3d_order_confirmation: 'WHATSAPP_TEMPLATE_ORDER_CONFIRMATION',
  flux3d_payment_link: 'WHATSAPP_TEMPLATE_PAYMENT_LINK',
  flux3d_account_linked: 'WHATSAPP_TEMPLATE_CONNECTED',
  flux3d_auth_otp: 'WHATSAPP_AUTH_TEMPLATE_NAME',
}

async function listTemplates() {
  const res = await fetch(BASE_URL + '?fields=name,status,id&limit=100', {
    headers: { Authorization: 'Bearer ' + token },
  })
  const data = await res.json().catch(() => ({ data: [] }))
  return Array.isArray(data.data) ? data.data : []
}

async function createTemplate(tpl) {
  let components
  if (tpl.auth) {
    components = [
      { type: 'BODY', add_security_recommendation: true },
      {
        type: 'BUTTONS',
        buttons: [{ type: 'OTP', otp_type: 'COPY_CODE', text: 'Copy code' }],
      },
    ]
  } else {
    components = [
      {
        type: 'BODY',
        text: tpl.body,
        example: { body_text: [tpl.examples] },
      },
    ]
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: tpl.name,
      category: tpl.category,
      language: tpl.language,
      components,
    }),
  })

  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function main() {
  console.log('WhatsApp message templates — reconcile\n')
  console.log('WABA: ' + wabaId + '\n')

  const existing = await listTemplates()
  const existingByName = {}
  for (const t of existing) existingByName[t.name] = t

  const results = []
  for (const tpl of templates) {
    const found = existingByName[tpl.name]
    if (found) {
      results.push({ name: tpl.name, status: found.status, ok: true, existing: true })
      console.log('SKIP  ' + tpl.name + ' (already exists, status=' + found.status + ')')
      continue
    }
    process.stdout.write('CREATE ' + tpl.name + ' ... ')
    const result = await createTemplate(tpl)
    results.push({ name: tpl.name, ok: result.ok, status: result.ok ? 'CREATED' : 'FAILED' })
    if (result.ok) {
      console.log('OK (id=' + result.data.id + ', ' + result.data.status + ')')
    } else {
      console.log('FAILED (' + result.status + ')')
      const err = result.data?.error
      console.error('   ' + (err?.message || JSON.stringify(result.data)))
      if (err?.error_user_msg) console.error('   ' + err.error_user_msg)
    }
  }

  // Persist env vars for every configured template (even existing ones)
  let envLocal = ''
  try {
    envLocal = await fs.readFile(ENV_LOCAL_PATH, 'utf8')
  } catch {
    // file may not exist yet
  }

  for (const tpl of templates) {
    const key = ENV_MAP[tpl.name]
    if (!key) continue
    const pattern = new RegExp('^' + key + '=.*$', 'm')
    const line = key + '=' + tpl.name
    if (pattern.test(envLocal)) envLocal = envLocal.replace(pattern, line)
    else envLocal = envLocal.trimEnd() + '\n' + line + '\n'
  }
  await fs.writeFile(ENV_LOCAL_PATH, envLocal)

  const approved = results.filter(r => r.status === 'APPROVED').length
  const pending = results.filter(r => r.status === 'PENDING' || r.status === 'CREATED').length
  const failed = results.filter(r => r.status === 'FAILED').length
  console.log('\n--- Summary: ' + approved + ' approved, ' + pending + ' pending, ' + failed + ' failed ---')
  console.log('Env vars written to .env.local')

  if (failed > 0) process.exitCode = 1
}

main().catch((err) => { console.error(err); process.exit(1) })
