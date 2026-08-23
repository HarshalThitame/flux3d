import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { isShiprocketConfigured, istNow, schedulePickup } from '@/lib/shiprocket/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BLOCKED_FULFILMENT = new Set(['delivered', 'cancelled'])

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
      .select('id, shipment_id, fulfilment_status, order_status, tracking_number')
      .eq('id', orderId)
      .maybeSingle()
    if (loadError) throw new Error(loadError.message)
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const shipmentId = Number(order.shipment_id)
    if (!Number.isFinite(shipmentId) || shipmentId <= 0) {
      return NextResponse.json(
        { error: 'No Shiprocket shipment exists for this order yet.' },
        { status: 400 }
      )
    }
    if (BLOCKED_FULFILMENT.has(String(order.fulfilment_status ?? '')) || order.order_status === 'cancelled') {
      return NextResponse.json({ error: 'Pickup cannot be scheduled for this order.' }, { status: 400 })
    }

    const pickup = await schedulePickup(shipmentId, istNow().date)
    if (!pickup?.pickup_status) {
      return NextResponse.json({
        ok: false,
        pickupScheduled: false,
        message: String(pickup?.response ?? 'Shiprocket did not confirm the pickup slot.'),
      })
    }

    const nowIso = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('shelf_orders')
      .update({ pickup_scheduled_at: nowIso, updated_at: nowIso })
      .eq('id', orderId)
    if (updateError) throw new Error(updateError.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'shop_order_pickup_retry_shiprocket',
      target_type: 'order',
      target_id: orderId,
      new_value: { shipmentId, pickupScheduledAt: nowIso },
    }).catch(() => {})

    return NextResponse.json({ ok: true, pickupScheduled: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
