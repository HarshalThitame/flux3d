/**
 * Setup QStash schedule for syncing stale Shiprocket shipments.
 *
 * Run once to create the scheduled job:
 *   npx tsx scripts/setup-sync-stale-shipments-schedule.ts
 *
 * Env required:
 *   QSTASH_TOKEN — from Upstash console
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
  const endpoint = `${SITE_URL.replace(/\/+$/, '')}/api/cron/sync-stale-shipments`

  console.log('Creating QStash schedule for stale shipment sync...')
  console.log('Endpoint:', endpoint)

  const schedule = await client.schedules.create({
    destination: endpoint,
    cron: '0 */6 * * *', // Every 6 hours UTC
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
