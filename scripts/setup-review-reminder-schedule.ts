/**
 * Setup QStash schedule for review reminder emails.
 *
 * Run once to create the scheduled job:
 *   npx tsx scripts/setup-review-reminder-schedule.ts
 *
 * Env required:
 *   QSTASH_TOKEN — from Upstash console
 *   QSTASH_CURRENT_SIGNING_KEY — from Upstash console (for signature verification)
 *   QSTASH_NEXT_SIGNING_KEY — from Upstash console
 *   NEXT_PUBLIC_SITE_URL — your production URL
 */

import { Client } from '@upstash/qstash'
import dotenv from 'dotenv'

dotenv.config()

const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'

async function main() {
  if (!QSTASH_TOKEN) {
    console.error('Error: QSTASH_TOKEN is not set')
    process.exit(1)
  }

  const client = new Client({ token: QSTASH_TOKEN })
  const endpoint = `${SITE_URL.replace(/\/+$/, '')}/api/cron/review-reminders`

  console.log('Creating QStash schedule for review reminders...')
  console.log('Endpoint:', endpoint)

  const schedule = await client.schedules.create({
    destination: endpoint,
    cron: '0 9 * * *', // Daily at 9:00 AM UTC
    retries: 3,
  })

  console.log('Schedule created successfully!')
  console.log('Schedule ID:', schedule.scheduleId)
  console.log('')
  console.log('To verify or manage schedules, visit your Upstash QStash dashboard.')
  console.log('To delete this schedule, run:')
  console.log(`  npx tsx -e "require('@upstash/qstash').Client({token:'${QSTASH_TOKEN}'}).schedules.delete('${schedule.scheduleId}')"`)
}

main().catch((err) => {
  console.error('Failed to create schedule:', err)
  process.exit(1)
})
