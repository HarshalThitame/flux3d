// Live smoke test — sends every approved Flux3D HSM template to a test number.
//
// Usage: TEST_PHONE=9623023477 node scripts/test-templates.mjs
// Reads WHATSAPP_* credentials from env or .env.local.

try {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })
} catch {
  // rely on real environment variables
}

const wabaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
const apiVersion = process.env.WHASAPP_API_VERSION?.trim() || 'v22.0'
const testPhoneRaw = (process.env.TEST_PHONE || '').trim()

if (!wabaPhoneId || !token) {
  console.error('Missing WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN')
  process.exit(1)
}
if (!testPhoneRaw || !/^\d{10}$/.test(testPhoneRaw)) {
  console.error('Set TEST_PHONE to a 10-digit number, e.g. TEST_PHONE=9623023477')
  process.exit(1)
}
const to = '91' + testPhoneRaw

const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_IN'

const name = (key) => process.env[`WHATSAPP_TEMPLATE_${key}`]?.trim() || null

const messages = [
  {
    key: 'ORDER_SHIPPED',
    trigger: 'order_shipped',
    components: [
      { type: 'body', parameters: [
        { type: 'text', text: 'TEST-1001' },
        { type: 'text', text: 'Delhivery' },
        { type: 'text', text: 'TRK-TEST-8871' },
      ] },
    ],
  },
  {
    key: 'ORDER_DELIVERED',
    trigger: 'order_delivered',
    components: [
      { type: 'body', parameters: [{ type: 'text', text: 'TEST-1002' }] },
    ],
  },
  {
    key: 'ORDER_CONFIRMATION',
    trigger: 'order_confirmed',
    components: [
      { type: 'body', parameters: [
        { type: 'text', text: 'TEST-1003' },
        { type: 'text', text: '\u20b91,499.00' },
      ] },
    ],
  },
  {
    key: 'PAYMENT_LINK',
    trigger: 'payment_link',
    components: [
      { type: 'body', parameters: [
        { type: 'text', text: 'TEST-1004' },
        { type: 'text', text: 'https://rzp.io/i/test-link-flux3d' },
      ] },
    ],
  },
  {
    key: 'CONNECTED',
    trigger: 'account_connected',
    components: [
      { type: 'body', parameters: [
        { type: 'text', text: 'Rutik' },
        { type: 'text', text: '3' },
      ] },
    ],
  },
]

async function sendOne(m) {
  const tplName = name(m.key)
  if (!tplName) {
    return { template: m.key, ok: false, skipped: true, info: `WHATSAPP_TEMPLATE_${m.key} not set` }
  }
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${wabaPhoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: tplName,
        language: { code: language },
        components: m.components,
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  const messageId = data?.messages?.[0]?.id
  return {
    template: `${m.key} (${tplName})`,
    trigger: m.trigger,
    ok: res.ok,
    messageId,
    error: res.ok ? undefined : JSON.stringify(data).slice(0, 300),
  }
}

console.log(`Sending ${messages.length} test templates to +91 ${testPhoneRaw}\n`)

const results = []
for (const m of messages) {
  process.stdout.write(`  ${m.key.padEnd(20)} ... `)
  try {
    const r = await sendOne(m)
    results.push(r)
    if (r.skipped) console.log('SKIPPED — ' + r.info)
    else if (r.ok) console.log('SENT  wamid=' + (r.messageId ?? '?'))
    else console.log('FAILED — ' + r.error)
  } catch (err) {
    results.push({ template: m.key, ok: false, error: String(err) })
    console.log('THREW — ' + err)
  }
  await new Promise((r) => setTimeout(r, 1200))
}

const sent = results.filter((r) => r.ok).length
console.log(`\nRESULT: ${sent}/${results.length} accepted by Meta`)
console.log('Delivery ticks (sent/delivered/read) arrive asynchronously via the webhook;')
console.log('check whatsapp_messages or the admin inbox for final status.')
if (sent < results.length) process.exitCode = 1
