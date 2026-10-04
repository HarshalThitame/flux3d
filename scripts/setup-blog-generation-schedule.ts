import { Client } from '@upstash/qstash'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const token = process.env.QSTASH_TOKEN
  if (!token) throw new Error('QSTASH_TOKEN is required.')
  const client = new Client({ token, baseUrl: process.env.QSTASH_URL })
  const destination = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in').replace(/\/+$/, '')}/api/cron/generate-blog`
  const schedules = await client.schedules.list()
  if (schedules.some((schedule: { destination?: string }) => schedule.destination?.includes('/api/cron/generate-blog'))) {
    console.log('Blog generation schedule already exists.')
    return
  }
  const created = await client.schedules.create({ destination, cron: '30 3 * * 1,3,6', retries: 2 })
  console.log(`Created blog generation schedule ${created.scheduleId} for 9:00 AM IST Monday, Wednesday, and Saturday.`)
}

main().catch((error) => { console.error(error); process.exit(1) })
