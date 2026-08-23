import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendDeliveryConfirmation, sendOutForDelivery } from '@/lib/email/triggers'
import { absoluteUrl } from '@/lib/site'
import { getGuestContact, type ShopFulfilmentStatus } from '@/lib/shop/orders'
import { notifyWhatsAppOrderDelivered } from '@/lib/whatsapp/notifications'

export type TrackingActivity = {
  date?: unknown
  status?: unknown
  activity?: unknown
  location?: unknown
  label?: unknown
  'sr-status-label'?: unknown
}

export type ShiprocketStatusMapping = {
  fulfilmentStatus: ShopFulfilmentStatus | null
  isDelivered: boolean
  isRto: boolean
}

export type ShiprocketWebhookPayloadLike = {
  awb?: unknown
  current_status?: unknown
  current_status_updated_at?: unknown
  shipment_track_activities?: TrackingActivity[]
  data?: Record<string, unknown>
}

function upper(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

export function mapShiprocketStatus(label: string): ShiprocketStatusMapping {
  const normalized = upper(label)

  if (normalized.includes('UNDELIVERED')) {
    return { fulfilmentStatus: 'shipped', isDelivered: false, isRto: false }
  }
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
  if (normalized.includes('RTO')) {
    return { fulfilmentStatus: 'shipped', isDelivered: false, isRto: true }
  }

  return { fulfilmentStatus: null, isDelivered: false, isRto: false }
}

export function trackingEventKey(activity: TrackingActivity): string {
  return [activity.date, activity.status ?? activity.label, activity.activity, activity.location]
    .map((part) => upper(part))
    .join('|')
}

type OrderRow = Record<string, unknown> & {
  id: unknown
  user_id: unknown
  order_number: unknown
  fulfilment_status: unknown
  shipping_address: unknown
  guest_contact: unknown
  tracking_events: unknown
}

export type SyncTrackingResult = {
  duplicate: boolean
  fulfilmentStatus: ShopFulfilmentStatus | null
}

export async function syncOrderTracking(
  order: OrderRow,
  latestActivity: TrackingActivity,
  rawPayload: unknown,
  awb: string
): Promise<SyncTrackingResult> {
  const supabase = createAdminSupabaseClient()

  const existing = Array.isArray(order.tracking_events) ? (order.tracking_events as unknown[]) : []
  const mapping = mapShiprocketStatus(String(latestActivity['sr-status-label'] ?? latestActivity.label ?? ''))

  const nextEvent = {
    date: upper(latestActivity.date) || new Date().toISOString(),
    status: String(latestActivity.status ?? ''),
    activity: String(latestActivity.activity ?? latestActivity.status ?? ''),
    location: String(latestActivity.location ?? ''),
    label: String(latestActivity['sr-status-label'] ?? latestActivity.label ?? ''),
    raw_payload: rawPayload,
  }

  const alreadyLogged = existing.some(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      trackingEventKey(entry as TrackingActivity) === trackingEventKey(latestActivity) &&
      (entry as { raw_payload?: unknown }).raw_payload !== undefined
  )

  if (alreadyLogged) {
    return { duplicate: true, fulfilmentStatus: mapping.fulfilmentStatus }
  }

  const updates: Record<string, unknown> = {
    tracking_events: [...existing, nextEvent],
    updated_at: new Date().toISOString(),
  }

  const wasDelivered = order.fulfilment_status === 'delivered'
  const previousFulfilment = String(order.fulfilment_status ?? '')

  if (mapping.fulfilmentStatus && previousFulfilment !== mapping.fulfilmentStatus) {
    updates.fulfilment_status = mapping.fulfilmentStatus
  }

  const { error: updateError } = await supabase.from('shelf_orders').update(updates).eq('id', String(order.id))
  if (updateError) throw new Error(updateError.message)

  const address =
    order.shipping_address && typeof order.shipping_address === 'object'
      ? (order.shipping_address as Record<string, unknown>)
      : {}
  const guestContact = getGuestContact(order)
  const profile = order.user_id
    ? (await supabase
        .from('profiles')
        .select('email, full_name, phone_number')
        .eq('id', String(order.user_id))
        .maybeSingle()).data as { email: string | null; full_name: string | null; phone_number: string | null } | null
    : null
  const customerEmail = profile?.email ?? guestContact.email
  const customerName =
    profile?.full_name ?? (address.name ? String(address.name) : 'Customer')
  const customerPhone = (profile?.phone_number ?? address.phone)
    ? String(profile?.phone_number ?? address.phone ?? '').replace(/\D/g, '')
    : ''
  const trackingUrl = `https://shiprocket.co/tracking/${awb}`
  const courierLabel = upper(latestActivity.location ?? '') || 'Courier'
  const orderNumber = String(order.order_number ?? '')

  if (
    mapping.fulfilmentStatus === 'delivering' &&
    previousFulfilment !== 'delivering' &&
    customerEmail
  ) {
    sendOutForDelivery(
      String(order.user_id ?? ''),
      customerEmail,
      orderNumber,
      customerName,
      { number: awb, courierName: courierLabel, url: trackingUrl }
    ).catch((err) => {
      console.error('[shiprocket/sync] Failed to enqueue OutForDelivery email:', err)
    })
  }

  if (mapping.fulfilmentStatus === 'delivered' && !wasDelivered) {
    if (customerEmail) {
      sendDeliveryConfirmation(
        String(order.user_id ?? ''),
        customerEmail,
        orderNumber,
        customerName,
        absoluteUrl('/3d-shop/orders'),
      ).catch((err) => {
        console.error('[shiprocket/sync] Failed to enqueue DeliveryConfirmation email:', err)
      })
    }

    if (customerPhone) {
      notifyWhatsAppOrderDelivered({ phone: customerPhone, orderNumber }).catch((err) => {
        console.error('[shiprocket/sync] Failed to send OrderDelivered WhatsApp:', err)
      })
    }
  }

  return { duplicate: false, fulfilmentStatus: mapping.fulfilmentStatus }
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000

export async function findStaleShipmentOrders(limit = 25): Promise<OrderRow[]> {
  const supabase = createAdminSupabaseClient()
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString()
  const { data, error } = await supabase
    .from('shelf_orders')
    .select('*')
    .not('tracking_number', 'is', null)
    .in('fulfilment_status', ['shipped', 'delivering'])
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as OrderRow[]
}
