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
import { hasAnyDimension, parseDimensionsJson } from '@/lib/shop/dimensions'
import { notifyWhatsAppOrderShipped } from '@/lib/whatsapp/notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BLOCKED_FULFILMENT = new Set(['delivered', 'cancelled'])
const DEFAULT_WEIGHT_G = 500
const DEFAULT_SIZE_CM = { length: 15, breadth: 10, height: 10 }

type Dims = {
  length_mm?: number
  width_mm?: number
  height_mm?: number
  weight_g?: number
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
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

    const { data: order, error: loadError } = await supabase
      .from('shelf_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    if (loadError) throw new Error(loadError.message)
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, phone_number')
      .eq('id', String(order.user_id))
      .maybeSingle()

    const customerEmail = profile?.email ?? null
    const customerPhone = profile?.phone_number
      ? String(profile.phone_number).replace(/\D/g, '')
      : phone

    // ── Items + package dimensions ──
    const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : []
    const productIds = items
      .map((item) => String(item.productId ?? item.product_id ?? ''))
      .filter(Boolean)

    let totalWeightG = 0
    let maxLengthCm = DEFAULT_SIZE_CM.length
    let maxBreadthCm = DEFAULT_SIZE_CM.breadth
    let maxHeightCm = DEFAULT_SIZE_CM.height

    const { data: products } = productIds.length
      ? await supabase.from('shelf_products').select('id, default_dimensions').in('id', productIds)
      : { data: null }

    const { data: variantDimensionRows } = productIds.length
      ? await supabase
          .from('shelf_variant_option_dimensions')
          .select('product_id, option_name, option_value, dimensions')
          .in('product_id', productIds)
      : { data: null }

    const orderItems: ShiprocketOrderItem[] = items.map((item) => {
      const qty = Math.max(Number(item.quantity ?? item.units ?? 1) || 1, 1)
      const unitPrice = Math.round(Number(item.unitPrice ?? 0) * 100) / 100

      const product = (products ?? []).find(
        (row) => String(row.id) === String(item.productId ?? item.product_id)
      )

      let dimsRecord: ReturnType<typeof parseDimensionsJson> = null
      const combination = asRecord(item.variantCombination ?? item.variant_combination ?? {})
      for (const [optionName, optionValue] of Object.entries(combination)) {
        if (typeof optionValue !== 'string') continue
        const match = (variantDimensionRows ?? []).find(
          (row) =>
            String(row.product_id) === String(product?.id) &&
            row.option_name === optionName &&
            row.option_value === optionValue &&
            row.dimensions
        )
        const parsed = match ? parseDimensionsJson(match.dimensions) : null
        if (parsed && hasAnyDimension(parsed)) {
          dimsRecord = parsed
          break
        }
      }
      if (!dimsRecord && product?.default_dimensions) {
        const productDims = parseDimensionsJson(product.default_dimensions)
        if (productDims && hasAnyDimension(productDims)) dimsRecord = productDims
      }

      const dims = (dimsRecord ?? {}) as Dims

      const weightG = Number(dims.weight_g ?? 0) > 0 ? Number(dims.weight_g) : DEFAULT_WEIGHT_G
      const lengthCm = Number(dims.length_mm ?? 0) > 0 ? Number(dims.length_mm) / 10 : DEFAULT_SIZE_CM.length
      const breadthCm = Number(dims.width_mm ?? 0) > 0 ? Number(dims.width_mm) / 10 : DEFAULT_SIZE_CM.breadth
      const heightCm = Number(dims.height_mm ?? 0) > 0 ? Number(dims.height_mm) / 10 : DEFAULT_SIZE_CM.height

      totalWeightG += weightG * qty
      maxLengthCm = Math.max(maxLengthCm, lengthCm)
      maxBreadthCm = Math.max(maxBreadthCm, breadthCm)
      maxHeightCm = Math.max(maxHeightCm, heightCm)

      return {
        name: String(item.productName ?? item.name ?? 'Product').slice(0, 100) || 'Product',
        sku: String(item.skuCode ?? item.sku_code ?? item.skuId ?? 'SKU').slice(0, 50) || 'SKU',
        units: qty,
        selling_price: unitPrice,
      }
    })

    const subTotal = Math.round(orderItems.reduce((sum, item) => sum + item.units * item.selling_price, 0) * 100) / 100
    const weightKg = Math.max(Math.round((totalWeightG / 1000) * 100) / 100, 0.1)
    const now = istNow()

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
        length: Math.max(Math.ceil(maxLengthCm), 1),
        breadth: Math.max(Math.ceil(maxBreadthCm), 1),
        height: Math.max(Math.ceil(maxHeightCm), 1),
        weight: weightKg,
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
    const updates = {
      tracking_number: awbCode,
      courier_name: courierName,
      tracking_url: trackingUrl,
      shiprocket_order_id: shiprocketOrderId ?? null,
      shipment_id: shipmentId,
      fulfilment_status: 'shipped',
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase.from('shelf_orders').update(updates).eq('id', orderId)
    if (updateError) throw new Error(updateError.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'shop_order_shipped_shiprocket',
      target_type: 'order',
      target_id: orderId,
      new_value: updates,
    }).catch(() => {})

    // ── Emails / WhatsApp (mirrors manual "shipped" handoff) ──
    const customerName = profile?.full_name ?? fullName
    const itemsForEmail = items.map((item) => ({
      name: String(item.productName ?? item.name ?? 'Product'),
      material: String(item.material ?? ''),
      color: String(item.variantLabel ?? item.color ?? ''),
      quantity: Number(item.quantity ?? 1),
    }))

    if (customerEmail) {
      sendOrderShipped(
        String(order.user_id),
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

function Snumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
