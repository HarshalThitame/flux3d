import 'dotenv/config'
import dotenv from 'dotenv'
import readline from 'node:readline/promises'

dotenv.config({ path: '.env.local' })

const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_SYSTEM_USER_TOKEN?.trim()
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0'

if (!token || !phoneNumberId) {
  console.error('Missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID in .env.local')
  process.exit(1)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const AUTH = { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }

async function main() {
  // 1. Check current status
  const check = await fetch('https://graph.facebook.com/' + apiVersion + '/' + phoneNumberId + '?fields=code_verification_status,status', AUTH)
  const checkBody = await check.json()
  console.log('Current status:', checkBody.code_verification_status, '/', checkBody.status)
  if (checkBody.code_verification_status === 'VERIFIED') {
    console.log('Phone number is already VERIFIED. No action needed.')
    rl.close()
    return
  }

  // 2. Request code
  console.log('Requesting SMS verification code...')
  const req = await fetch('https://graph.facebook.com/' + apiVersion + '/' + phoneNumberId + '/request_code', {
    method: 'POST',
    ...AUTH,
    body: JSON.stringify({ code_method: 'SMS', language: 'en', country_code_locale: 'IN' }),
  })
  const reqBody = await req.json()
  if (!req.ok) {
    console.error('request_code failed:', JSON.stringify(reqBody))
    rl.close()
    process.exit(1)
  }
  console.log('Code sent to the phone. Check your SMS.')

  const code = await rl.question('Enter the 6-digit verification code: ')
  const ver = await fetch('https://graph.facebook.com/' + apiVersion + '/' + phoneNumberId + '/verify_code', {
    method: 'POST',
    ...AUTH,
    body: JSON.stringify({ code: code.trim(), country_code_locale: 'IN' }),
  })
  const verBody = await ver.json()
  if (!ver.ok) {
    console.error('verify_code failed:', JSON.stringify(verBody))
    rl.close()
    process.exit(1)
  }
  console.log('Phone verified successfully!')

  // 3. Confirm
  const confirm = await fetch('https://graph.facebook.com/' + apiVersion + '/' + phoneNumberId + '?fields=code_verification_status,status', AUTH)
  const confirmBody = await confirm.json()
  console.log('New status:', confirmBody.code_verification_status, '/', confirmBody.status)
  rl.close()
}

main().catch((err) => { console.error(err); rl.close(); process.exit(1) })
