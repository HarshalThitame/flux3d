/**
 * Setup QStash schedule for the Meta catalog full-sync.
 * Replaces the GitHub Actions scheduler (which relied on a long-lived
 * CRON_SECRET Bearer header) — QStash signs every request, so the endpoint
 * can accept signature verification only.
 *
 * Run once:
 *   npx tsx scripts/setup-meta-catalog-schedule.ts
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

  const client = new Client({
    token: QSTASH_TOKEN,
    // Regional deployments (e.g. https://qstash-us-east-1.upstash.io) require
    // the explicit baseUrl — the SDK default targets the EU endpoint.
    baseUrl: process.env.QSTASH_URL,
  })
  const endpoint = `${SITE_URL.replace(/\/+$/, '')}/api/cron/sync-meta-catalog`

  console.log('Creating QStash schedule for Meta catalog sync...')
  console.log('Endpoint:', endpoint)

  const existing = await client.schedules.list().catch(() => null)
  const alreadyScheduled = existing?.find(
    (s: { destination?: string }) =>
      typeof s?.destination === 'string' && s.destination.includes('/api/cron/sync-meta-catalog'),
  )
  if (alreadyScheduled) {
    console.log('Schedule already exists:', alreadyScheduleId(alreadyScheduled))
    return
  }

  const schedule = await client.schedules.create({
    destination: endpoint,
    cron: '0 */6 * * *', // every 6 hours (matches previous GH Actions schedule)
    retries: 3,
  })

  console.log('Schedule created successfully!')
  console.log('Schedule ID:', schedule.scheduleId)
}

function alreadyScheduleId(s: unknown): string {
  return typeof s === 'object' && s !== null && 'scheduleId' in s
    ? String((s as { scheduleId: unknown }).scheduleId)
    : 'unknown'
}

main().catch((err) => {
  console.error('Failed to create schedule:', err)
  process.exit(1)
})
