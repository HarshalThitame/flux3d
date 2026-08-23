import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import {
  assignAwb,
  createAdhocOrder,
  getShiprocketPickupLocation,
  isShiprocketConfigured,
  istNow,
  schedulePickup,
  type ShiprocketOrderItem,
} from '@/lib/shiprocket/client'
import { sendOrderShipped } from '@/lib/email/triggers'
import {
  applyPackageOverrides,
  clampPackageOverrides,
  computeSuggestedPackage,
  ESTIMATED_DELIVERY_DAYS,
  istDatePlusDays,
} from '@/lib/shop/package-dimensions'
import { notifyWhatsAppOrderShipped } from '@/lib/whatsapp/notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BLOCKED_FULFILMENT = new Set(['delivered', 'cancelled'])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function Snumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function loadOrder(supabase: ReturnType<typeof createAdminSupabaseClient>, orderId: string) {
  const { data: order, error: loadError } = await supabase
    .from('shelf_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()
  if (loadError) throw new Error(loadError.message)
  return order
}

async function loadPackageInputs(supabase: ReturnType<typeof createAdminSupabaseClient>, items: Array<Record<string, unknown>>) {
  const productIds = [...new Set(
    items
      .map((item) => String(item.productId ?? item.product_id ?? ''))
      .filter(Boolean)
  )]

  const { data: products } = productIds.length
    ? await supabase.from('shelf_products').select('id, default_dimensions').in('id', productIds)
    : { data: null }

  const { data: variantDimensionRows } = productIds.length
    ? await supabase
        .from('shelf_variant_option_dimensions')
        .select('product_id, option_name, option_value, dimensions')
        .in('product_id', productIds)
    : { data: null }

  return {
    products: (products ?? []) as Array<Record<string, unknown>>,
    variantDimensionRows: (variantDimensionRows ?? []) as Array<Record<string, unknown>>,
  }
}

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminPermission('orders.update')
  if ('response' in auth) return auth.response

  if (!isShiprocketConfigured()) {
    return NextResponse.json(
      { error: 'Shiprocket is not configured. Set SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION.' },
      { status: 400 }
    )
  }

  try {
    const { orderId } = await context.params
    const supabase = createAdminSupabaseClient()

    const order = await loadOrder(supabase, orderId)
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    if (BLOCKED_FULFILMENT.has(String(order.fulfilment_status ?? '')) || order.tracking_number) {
      return NextResponse.json({
        suggested: null,
        estimated_delivery: istDatePlusDays(ESTIMATED_DELIVERY_DAYS),
        shippable: false,
        reason: order.tracking_number ? 'already_shipped' : 'blocked_fulfilment',
      })
    }

    const items = Array.isArray(order.items) ? (order.items as unknown[]).map(asRecord) : []
    const { products, variantDimensionRows } = await loadPackageInputs(supabase, items)

    return NextResponse.json({
      suggested: computeSuggestedPackage(items, products, variantDimensionRows),
      estimated_delivery: istDatePlusDays(ESTIMATED_DELIVERY_DAYS),
      shippable: true,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminPermission('orders.update')
  if ('response' in auth) return auth.response

  if (!isShiprocketConfigured()) {
    return NextResponse.json(
      { error: 'Shiprocket is not configured. Set SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION.' },
      { status: 400 }
    )
  }

  try {
    const { orderId } = await context.params
    const supabase = createAdminSupabaseClient()

    const body = await request.json().catch(() => ({}))
    const overrides = clampPackageOverrides(asRecord(body).package)

    const order = await loadOrder(supabase, orderId)
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const fulfilment = String(order.fulfilment_status ?? '')
    if (BLOCKED_FULFILMENT.has(fulfilment)) {
      return NextResponse.json({ error: `Cannot ship an order in "${fulfilment}" state.` }, { status: 400 })
    }
    if (order.tracking_number) {
      return NextResponse.json(
        { error: 'This order already has tracking info (a shipment may already exist).' },
        { status: 400 }
      )
    }

    const address = asRecord(order.shipping_address)
    const fullName = String(address.name ?? 'Customer').trim()
    const nameParts = fullName.split(/\s+/)
    const firstName = nameParts[0] ?? 'Customer'
    const lastName = nameParts.slice(1).join(' ')
    const addressLine1 = String(address.line1 ?? '')
    const addressLine2 = address.line2 ? String(address.line2) : ''
    const city = String(address.city ?? '')
    const state = String(address.state ?? '')
    const pincode = String(address.pincode ?? '').replace(/\D/g, '')
    const phone = String(address.phone ?? '').replace(/\D/g, '')

    // Guest orders (user_id IS NULL) have no profile — fall back to the
    // guest_contact email snapshot so Shiprocket gets a real billing_email.
    const guestContact = asRecord(order.guest_contact)
    const guestEmail = typeof guestContact.email === 'string' ? guestContact.email.trim() : ''

    const profile = order.user_id
      ? (await supabase
          .from('profiles')
          .select('email, full_name, phone_number')
          .eq('id', String(order.user_id))
          .maybeSingle()).data as { email: string | null; full_name: string | null; phone_number: string | null } | null
      : null

    const customerEmail = profile?.email ?? guestEmail ?? null
    const customerPhone = profile?.phone_number
      ? String(profile.phone_number).replace(/\D/g, '')
      : phone

    const items = Array.isArray(order.items) ? (order.items as unknown[]).map(asRecord) : []

    const orderItems: ShiprocketOrderItem[] = items.map((item) => {
      const qty = Math.max(Math.floor(Number(item.quantity ?? item.units ?? 1)) || 1, 1)
      const unitPrice = Math.round(Number(item.unitPrice ?? 0) * 100) / 100
      return {
        name: String(item.productName ?? item.name ?? 'Product').slice(0, 100) || 'Product',
        sku: String(item.skuCode ?? item.sku_code ?? item.skuId ?? 'SKU').slice(0, 50) || 'SKU',
        units: qty,
        selling_price: unitPrice,
      }
    })

    const subTotal = Math.round(orderItems.reduce((sum, item) => sum + item.units * item.selling_price, 0) * 100) / 100
    const now = istNow()
    const { products, variantDimensionRows } = await loadPackageInputs(supabase, items)
    const pkg = applyPackageOverrides(
      computeSuggestedPackage(items, products, variantDimensionRows),
      overrides
    )

    // ── 1. Create adhoc order in Shiprocket (or resume a previously created one) ──
    let shiprocketOrderId: number | null = order.shiprocket_order_id ? Snumber(order.shiprocket_order_id) : null
    let shipmentId: number | null = order.shipment_id ? Snumber(order.shipment_id) : null

    if (!shipmentId) {
      const created = await createAdhocOrder({
        order_id: String(order.order_number ?? orderId).slice(0, 50),
        order_date: now.dateTime,
        pickup_location: getShiprocketPickupLocation(),
        billing_customer_name: firstName.slice(0, 50),
        billing_last_name: lastName.slice(0, 50),
        billing_address: addressLine1.slice(0, 100),
        billing_address_2: addressLine2.slice(0, 100),
        billing_city: city.slice(0, 50),
        billing_state: state.slice(0, 50),
        billing_pincode: Number(pincode) || 0,
        billing_country: 'India',
        billing_email: customerEmail ?? '',
        billing_phone: Number(customerPhone) || 0,
        shipping_is_billing: true,
        order_items: orderItems,
        payment_method: 'Prepaid',
        sub_total: subTotal,
        length: Math.max(Math.ceil(pkg.length_cm), 1),
        breadth: Math.max(Math.ceil(pkg.breadth_cm), 1),
        height: Math.max(Math.ceil(pkg.height_cm), 1),
        weight: pkg.weight_kg,
      })

      shiprocketOrderId = created.order_id ? Snumber(created.order_id) : null
      shipmentId = created.shipment_id ? Snumber(created.shipment_id) : null
      if (!shipmentId) {
        throw new Error('Shiprocket did not return a shipment_id for the created order.')
      }

      // Persist immediately so a later step can safely resume instead of
      // creating duplicate Shiprocket orders on retry.
      const { error: persistError } = await supabase
        .from('shelf_orders')
        .update({
          shiprocket_order_id: shiprocketOrderId ?? null,
          shipment_id: shipmentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
      if (persistError) throw new Error(persistError.message)
    }

    // ── 2. Assign AWB ──
    const awbResult = await assignAwb(shipmentId)
    const awbData =
      awbResult?.response?.data ??
      awbResult?.data ??
      awbResult
    const awbCode = String(awbData?.awb_code ?? '').trim()
    const courierName = String(awbData?.courier_name ?? 'Shiprocket').trim()
    if (!awbCode) {
      const shiprocketMessage = String(awbData?.awb_assign_error ?? awbResult?.message ?? '').trim()
      throw new Error(
        shiprocketMessage ||
        'Shiprocket did not return an AWB code for the shipment (courier not available for this pincode?).'
      )
    }

    // ── 3. Schedule pickup ──
    const pickup = await schedulePickup(shipmentId, now.date)
    const pickupScheduled = Boolean(pickup?.pickup_status)

    const trackingUrl = `https://shiprocket.co/tracking/${awbCode}`

    // ── 4. Persist tracking + mark as shipped ──
    const notificationsAlreadySent = Boolean(order.shipped_notifications_sent_at)
    const updates: Record<string, unknown> = {
      tracking_number: awbCode,
      courier_name: courierName,
      tracking_url: trackingUrl,
      shiprocket_order_id: shiprocketOrderId ?? null,
      shipment_id: shipmentId,
      fulfilment_status: 'shipped',
      estimated_delivery: istDatePlusDays(ESTIMATED_DELIVERY_DAYS),
      updated_at: new Date().toISOString(),
    }
    if (!notificationsAlreadySent) {
      updates.shipped_notifications_sent_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase.from('shelf_orders').update(updates).eq('id', orderId)
    if (updateError) throw new Error(updateError.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'shop_order_shipped_shiprocket',
      target_type: 'order',
      target_id: orderId,
      new_value: { ...updates, package: pkg },
    }).catch(() => {})

    // ── Emails / WhatsApp (mirrors manual "shipped" handoff) ──
    const customerName = profile?.full_name ?? fullName
    const itemsForEmail = items.map((item) => ({
      name: String(item.productName ?? item.name ?? 'Product'),
      material: String(item.material ?? ''),
      color: String(item.variantLabel ?? item.color ?? ''),
      quantity: Number(item.quantity ?? 1),
    }))

    if (!notificationsAlreadySent) {
      if (customerEmail) {
        sendOrderShipped(
          String(order.user_id ?? ''),
          customerEmail,
          String(order.order_number ?? ''),
          customerName,
          itemsForEmail,
          awbCode,
          courierName,
          trackingUrl,
        ).catch((err) => {
          console.error('[shiprocket/ship] Failed to enqueue OrderShipped email:', err)
        })
      }

      if (customerPhone) {
        notifyWhatsAppOrderShipped({
          phone: customerPhone,
          orderNumber: String(order.order_number ?? ''),
          courierName,
          trackingNumber: awbCode,
          trackingUrl,
        }).catch((err) => {
          console.error('[shiprocket/ship] Failed to send OrderShipped WhatsApp:', err)
        })
      }
    }

    return NextResponse.json({
      ok: true,
      awb: awbCode,
      courier: courierName,
      trackingUrl,
      shipmentId,
      pickupScheduled,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
