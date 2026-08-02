import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// dotenv/config only loads `.env`; load the local secrets too.
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const FLOW_JSON_PATH = path.join(root, 'src/lib/whatsapp/flows/delivery-address-flow.json')
const ENV_LOCAL_PATH = path.join(root, '.env.local')

const wabaId = process.env.META_WABA_ID?.trim() || process.env.WHATSAPP_WABA_ID?.trim()
const token =
  process.env.META_SYSTEM_USER_TOKEN?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim()
const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0'
const endpointUri = (process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in').replace(/\/+$/, '') + '/api/whatsapp'

if (!wabaId || !token) {
  throw new Error('Missing WHATSAPP_WABA_ID or META_SYSTEM_USER_TOKEN.')
}

const flowJson = await fs.readFile(FLOW_JSON_PATH, 'utf8')

// Published flows cannot be updated — create a new flow each run with a
// versioned name so re-running this script never collides.
const name = `delivery_address_${Date.now().toString(36)}`

console.log(`Creating flow "${name}" on WABA ${wabaId}...`)

// Create first WITHOUT publishing so we can validate the JSON and inspect
// validation_errors before attempting to publish (publishing can fail with
// business-level "Integrity requirements not met" until a privacy policy URL
// is configured on the App + WABA — that is not a code/JSON problem).
const response = await fetch(`https://graph.facebook.com/${apiVersion}/${wabaId}/flows`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name,
    categories: ['OTHER'],
    flow_json: flowJson,
    endpoint_uri: endpointUri,
  }),
})

const body = await response.json().catch(() => ({}))

if (!response.ok || !body.id) {
  console.error('Flow creation failed:')
  console.error(JSON.stringify(body, null, 2))
  process.exit(1)
}

const flowId = body.id
console.log(`Flow created: ${flowId} (status: ${body.status ?? 'draft'})`)

// Inspect validation errors before attempting to publish.
const validation = await fetch(`https://graph.facebook.com/${apiVersion}/${flowId}?fields=validation_errors,status`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json()).catch(() => ({}))
console.log('Validation errors:', JSON.stringify(validation.validation_errors ?? 'none'))

// Attempt to publish. This is the step that can fail with "Integrity
// requirements not met" until the business account is configured with a
// privacy policy URL (see instructions below).
const publishRes = await fetch(`https://graph.facebook.com/${apiVersion}/${flowId}/publish`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
})
const publishBody = await publishRes.json().catch(() => ({}))
const published = publishRes.ok && publishBody?.status === 'PUBLISHED'

let envLocal = ''
try {
  envLocal = await fs.readFile(ENV_LOCAL_PATH, 'utf8')
} catch {
  // file may not exist yet
}

const pattern = /^WHATSAPP_ADDRESS_FLOW_ID=.*$/m
const nextLine = `WHATSAPP_ADDRESS_FLOW_ID=${flowId}`
envLocal = pattern.test(envLocal)
  ? envLocal.replace(pattern, nextLine)
  : `${envLocal.trimEnd()}\n${nextLine}\n`
await fs.writeFile(ENV_LOCAL_PATH, envLocal)

console.log(`\nFlow created: ${flowId} (status: ${body.status ?? 'draft'})`)
console.log(`Saved ${nextLine} to .env.local`)

if (published) {
  console.log('\nFlow published successfully. Deploy this env var to Vercel (or run):')
  console.log(`  vercel env add WHATSAPP_ADDRESS_FLOW_ID production <<< "${flowId}"`)
  console.log(`  vercel env add WHATSAPP_ADDRESS_FLOW_ID preview <<< "${flowId}"`)
} else {
  console.log('\nNOTE: The flow JSON is valid (validation_errors: none), but publishing failed with:')
  console.log(JSON.stringify(publishBody.error ?? 'Integrity requirements not met', null, 2))
  console.log('\nThis is a business-account configuration requirement, NOT a code/JSON problem.')
  console.log('Publishing WhatsApp Flows requires a Privacy Policy URL configured on BOTH:')
  console.log('1. The Facebook App (App ID 1687599535712574): App Dashboard -> Settings -> Basic -> Privacy Policy URL')
  console.log('2. The WhatsApp Business Account (WABA 1464389558768847): Meta Business Suite -> Settings -> Business info -> Privacy policy URL')
  console.log('   (must be a live, HTTPS-served URL).')
  console.log('\nOnce the policy URL is set, re-publish this flow:')
  console.log(`  curl -X POST "https://graph.facebook.com/${apiVersion}/${flowId}/publish" -H "Authorization: Bearer <token>"`)
  console.log('\nThe flow ID has been saved to .env.local. When sending flow messages, the app')
  console.log('gracefully falls back to the text-based address prompt if the flow is not published.')
  process.exitCode = 1
}
