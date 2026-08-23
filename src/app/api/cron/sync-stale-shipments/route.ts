import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { Receiver } from '@upstash/qstash'
import { trackShipment } from '@/lib/shiprocket/client'
import { findStaleShipmentOrders, syncOrderTracking, type TrackingActivity } from '@/lib/shiprocket/tracking-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
})

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader.slice(7)),
      Buffer.from(cronSecret),
    )
  } catch {
    return false
  }
}

async function verifyQStash(request: Request): Promise<boolean> {
  const signature = request.headers.get('upstash-signature') ?? ''
  if (!signature) return false
  const body = await request.clone().text().catch(() => '')
  try {
    return await qstashReceiver.verify({
      body,
      signature,
      url: request.url,
    })
  } catch {
    return false
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

type ExtractedTracking = {
  latestActivity: TrackingActivity
  rawPayload: unknown
}

function extractTracking(payload: unknown, awb: string): ExtractedTracking | null {
  const root = asRecord(payload)
  if (!root) return null
  const entry =
    asRecord(root[awb]) ??
    (Object.values(root).map(asRecord).find(Boolean) as Record<string, unknown> | undefined) ??
    null

  const trackArray = Array.isArray(entry?.shipment_track) ? entry?.shipment_track : []
  const track = asRecord(trackArray[trackArray.length - 1])
  const activities = Array.isArray(entry?.shipment_track_activities) ? entry?.shipment_track_activities : []
  const latestActivity = ((activities[activities.length - 1] ?? {}) as TrackingActivity) ?? {}

  if (!activities.length && !track) return null

  const merged: TrackingActivity = {
    date: latestActivity.date ?? track?.current_status_updated_at,
    status: latestActivity.status ?? track?.current_status,
    activity: latestActivity.activity ?? latestActivity.status ?? track?.current_status,
    location: latestActivity.location,
    'sr-status-label': latestActivity['sr-status-label'] ?? latestActivity.label ?? track?.current_status,
  }

  return { latestActivity: merged, rawPayload: payload }
}

export async function GET(request: Request) {
  const isAuthorized = (await verifyQStash(request)) || (await verifyCronAuth(request))
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orders = await findStaleShipmentOrders(25)

    let synced = 0
    let failed = 0
    const results: Array<{ orderNumber: string; fulfilmentStatus: string | null; duplicate?: boolean }> = []

    for (const order of orders) {
      const awb = String(order.tracking_number ?? '').trim()
      if (!awb) continue
      try {
        const payload = await trackShipment(awb)
        const extracted = extractTracking(payload, awb)
        if (!extracted) continue
        const result = await syncOrderTracking(order, extracted.latestActivity, extracted.rawPayload, awb)
        synced += 1
        results.push({
          orderNumber: String(order.order_number ?? ''),
          fulfilmentStatus: result.fulfilmentStatus,
          duplicate: result.duplicate,
        })
      } catch (error) {
        failed += 1
        console.error(`[cron/sync-stale-shipments] Failed to sync AWB ${awb}:`, error)
      }
    }

    return NextResponse.json({ success: true, checked: orders.length, synced, failed, results })
  } catch (error) {
    console.error('[cron/sync-stale-shipments] Run failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed.' },
      { status: 500 }
    )
  }
}
