import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { processWebhookEventById } from '@/lib/payments/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_RETRIES = 3
const COOLDOWN_MINUTES = 5
const BATCH_SIZE = 12

async function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const expected = Buffer.from(authHeader.slice(7))
  const actual = Buffer.from(cronSecret)
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

export async function GET(request: Request) {
  if (!await verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Missing Supabase config.' }, { status: 500 })
  }

  const { data: events, error: fetchError } = await supabase.rpc('get_retryable_payment_events', {
    p_max_retries: MAX_RETRIES,
    p_cooldown_minutes: COOLDOWN_MINUTES,
    p_batch_size: BATCH_SIZE,
  })

  if (fetchError) {
    console.error('[cron] Failed to fetch retryable payment events:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ retriedCount: 0 })
  }

  let retriedCount = 0
  let failedCount = 0
  const retriedIds: string[] = []

  for (const event of events) {
    const eventId: string = event.id
    try {
      await processWebhookEventById(eventId)
      retriedCount++
      retriedIds.push(eventId)
    } catch (error) {
      failedCount++
      console.error(`[cron] Retry failed for payment event ${eventId}:`, error)
    }
  }

  return NextResponse.json({
    success: true,
    retriedCount,
    failedCount,
    totalAttempted: events.length,
    retriedIds,
  })
}
