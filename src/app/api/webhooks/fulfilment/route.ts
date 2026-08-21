import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendDeliveryConfirmation } from '@/lib/email/triggers'
import { notifyWhatsAppOrderDelivered } from '@/lib/whatsapp/notifications'
import { absoluteUrl } from '@/lib/site'
import type { ShopFulfilmentStatus } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ShipmentActivity = {
  date?: unknown
  status?: unknown
  activity?: unknown
  location?: unknown
  'sr-status-label'?: unknown
}

type ShiprocketWebhookPayload = {
  awb?: unknown
  current_status?: unknown
  current_status_updated_at?: unknown
  shipment_track_activities?: ShipmentActivity[]
  data?: Record<string, unknown>
}

type ProfileRow = {
  email: string | null
  full_name: string | null
  phone_number: string | null
}

function upper(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

export function mapShiprocketStatus(label: string): {
  fulfilmentStatus: ShopFulfilmentStatus | null
  isDelivered: boolean
  isRto: boolean
} {
  const normalized = upper(label)

  if (normalized.includes('DELIVERED')) {
    return { fulfilmentStatus: 'delivered', isDelivered: true, isRto: normalized.includes('RTO') }
  }
  if (normalized.includes('OUT FOR DELIVERY') || normalized.includes('OUT_FOR_DELIVERY')) {
    return { fulfilmentStatus: 'delivering', isDelivered: false, isRto: false }
  }
  if (normalized.includes('TRANSIT') || normalized.includes('IN TRANSIT')) {
    return { fulfilmentStatus: 'shipped', isDelivered: false, isRto: false }
  }
  if (normalized.includes('PICKED UP') || normalized.includes('PICKUP')) {
    return { fulfilmentStatus: 'shipped', isDelivered: false, isRto: false }
  }
  if (normalized.includes('UNDELIVERED')) {
    return { fulfilmentStatus: 'shipped', isDelivered: false, isRto: false }
  }
  if (normalized.includes('RTO')) {
    return { fulfilmentStatus: 'shipped', isDelivered: false, isRto: true }
  }

  return { fulfilmentStatus: null, isDelivered: false, isRto: false }
}

function eventKey(activity: ShipmentActivity): string {
  return `${upper(activity.date)}|${upper(activity.status)}|${upper(activity.activity)}|${upper(activity.location)}`
}

export async function POST(request: Request) {
  const secret = getEnv().SHIPROCKET_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Shiprocket webhook is not configured.' }, { status: 503 })
  }

  const apiKey = request.headers.get('x-api-key')?.trim() || ''
  if (!apiKey || apiKey !== secret) {
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
    const latestActivity = activities[activities.length - 1] ?? {}

    const existing = Array.isArray(order.tracking_events) ? (order.tracking_events as unknown[]) : []
    const mapping = mapShiprocketStatus(
      String(latestActivity['sr-status-label'] ?? payload.current_status ?? '')
    )

    const nextEvent = {
      date: upper(latestActivity.date || payload.current_status_updated_at) || new Date().toISOString(),
      status: String(latestActivity.status ?? payload.current_status ?? ''),
      activity: String(latestActivity.activity ?? latestActivity.status ?? payload.current_status ?? ''),
      location: String(latestActivity.location ?? ''),
      label: String(latestActivity['sr-status-label'] ?? payload.current_status ?? ''),
      raw_payload: payload as unknown,
    }

    const alreadyLogged = existing.some(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        eventKey((entry as ShipmentActivity)) === eventKey(latestActivity) &&
        (entry as { raw_payload?: unknown }).raw_payload !== undefined
    )

    if (alreadyLogged) {
      return NextResponse.json({ ok: true, acknowledged: true, duplicate: true })
    }

    const updates: Record<string, unknown> = {
      tracking_events: [...existing, nextEvent],
      updated_at: new Date().toISOString(),
    }

    const wasDelivered = order.fulfilment_status === 'delivered'
    if (mapping.fulfilmentStatus && order.fulfilment_status !== mapping.fulfilmentStatus) {
      updates.fulfilment_status = mapping.fulfilmentStatus
    }

    const { error: updateError } = await supabase.from('shelf_orders').update(updates).eq('id', order.id)
    if (updateError) throw new Error(updateError.message)

    if (mapping.fulfilmentStatus === 'delivered' && !wasDelivered) {
      const address =
        order.shipping_address && typeof order.shipping_address === 'object'
          ? (order.shipping_address as Record<string, unknown>)
          : {}
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, phone_number')
        .eq('id', order.user_id)
        .maybeSingle()

      const customer = profile as ProfileRow | null
      const email = customer?.email ?? null
      const customerName = customer?.full_name ?? (address.name ? String(address.name) : 'Customer')
      const orderNumber = String(order.order_number ?? '')

      if (email) {
        sendDeliveryConfirmation(
          String(order.user_id),
          email,
          orderNumber,
          customerName,
          absoluteUrl('/3d-shop/orders'),
        ).catch((err) => {
          console.error('[webhooks/fulfilment] Failed to enqueue DeliveryConfirmation email:', err)
        })
      }

      const customerPhone = (customer?.phone_number ?? address.phone)
        ? String(customer?.phone_number ?? address.phone ?? '').replace(/\D/g, '')
        : ''
      if (customerPhone) {
        notifyWhatsAppOrderDelivered({ phone: customerPhone, orderNumber }).catch((err) => {
          console.error('[webhooks/fulfilment] Failed to send OrderDelivered WhatsApp:', err)
        })
      }
    }

    return NextResponse.json({ ok: true, awb, fulfilmentStatus: mapping.fulfilmentStatus })
  } catch (error) {
    console.error('[webhooks/fulfilment] Processing failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed.' },
      { status: 500 }
    )
  }
}
