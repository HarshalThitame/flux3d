import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getEnv } from '@/lib/env'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { syncOrderTracking, type TrackingActivity, type ShiprocketWebhookPayloadLike } from '@/lib/shiprocket/tracking-sync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ShiprocketWebhookPayload = ShiprocketWebhookPayloadLike

function upper(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function isAuthorized(request: Request): boolean {
  const secret = getEnv().SHIPROCKET_WEBHOOK_SECRET
  if (!secret) return false
  const apiKey = request.headers.get('x-api-key')?.trim() || ''
  if (!apiKey) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(secret))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: ShiprocketWebhookPayload
  try {
    payload = (await request.json()) as ShiprocketWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const awb = upper(payload.awb ?? payload.data?.awb).replace(/\D/g, '')
  if (!awb) {
    return NextResponse.json({ ok: true, skipped: 'no_awb' })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { data: order, error: loadError } = await supabase
      .from('shelf_orders')
      .select('*')
      .eq('tracking_number', awb)
      .maybeSingle()

    if (loadError) throw new Error(loadError.message)
    if (!order) {
      console.warn(`[webhooks/fulfilment] No shelf order found for AWB ${awb}`)
      return NextResponse.json({ ok: true, lookedUp: false })
    }

    const activities = Array.isArray(payload.shipment_track_activities)
      ? payload.shipment_track_activities
      : []
    const latestActivity = (activities[activities.length - 1] ?? {}) as TrackingActivity

    const result = await syncOrderTracking(
      order,
      latestActivity,
      payload,
      awb
    )

    if (result.duplicate) {
      return NextResponse.json({ ok: true, acknowledged: true, duplicate: true })
    }

    return NextResponse.json({ ok: true, awb, fulfilmentStatus: result.fulfilmentStatus })
  } catch (error) {
    console.error('[webhooks/fulfilment] Processing failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed.' },
      { status: 500 }
    )
  }
}
