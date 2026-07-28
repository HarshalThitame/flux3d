import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import {
  AdminOrderStatusTransitionError,
  getAdminOrdersData,
  updateAdminOrderNotes,
  updateAdminOrderStatus,
  updateAdminOrderTracking,
} from '@/lib/admin/queries'
import { orderStatuses, type OrderStatus } from '@/lib/orders'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logAdminAction } from '@/lib/admin/auditLog'
import { sendOrderShipped } from '@/lib/email/triggers'

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 100))
    const result = await getAdminOrdersData(page, limit)
    return NextResponse.json({ orders: result.orders, total: result.total, page, limit })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as {
      groupId?: string
      status?: OrderStatus
      notes?: string | null
      cancellationReason?: string
      tracking_number?: string | null
      courier_name?: string | null
      tracking_url?: string | null
    }

    if (!body.groupId) {
      return NextResponse.json({ error: 'Group id is required.' }, { status: 400 })
    }

    if (body.status && !orderStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // ── Status update ──
    if (body.status) {
      const { data: oldRows } = await supabase
        .from('orders')
        .select('id, group_id, status, status_timestamps, full_name, email, user_id, tracking_number, courier_name, tracking_url')
        .or(`group_id.eq.${body.groupId},id.eq.${body.groupId}`)

      const order = await updateAdminOrderStatus(body.groupId, body.status, body.cancellationReason)

      await logAdminAction({
        admin_id: auth.user.id,
        action: 'update_order_status',
        target_type: 'order',
        target_id: body.groupId,
        old_value: oldRows ?? null,
        new_value: { status: body.status },
      })

      // Trigger OrderShipped email when transitioning to 'shipped'
      if (body.status === 'shipped') {
        const firstRow = oldRows?.[0] as Record<string, unknown> | undefined
        const trackingNumber = String(order.tracking_number ?? firstRow?.tracking_number ?? '')
        const courierName = String(order.courier_name ?? firstRow?.courier_name ?? '')
        const trackingUrl = String(order.tracking_url ?? firstRow?.tracking_url ?? '')
        const customerEmail = String(order.email ?? firstRow?.email ?? '')
        const userId = String(order.groupId ?? firstRow?.user_id ?? '')
        const customerName = String(order.fullName ?? firstRow?.full_name ?? 'Customer')

        if (trackingNumber && courierName && customerEmail) {
          // Fire-and-forget: we don't block the HTTP response on email dispatch
          sendOrderShipped(
            userId,
            customerEmail,
            order.orderNumber,
            customerName,
            order.items.map((it) => ({
              name: it.fileName || '3D Print',
              material: order.material,
              color: order.color,
              quantity: it.quantity,
            })),
            trackingNumber,
            courierName,
            trackingUrl || '#',
          ).catch((err) => {
            console.error('[api/admin/orders] Failed to enqueue OrderShipped email:', err)
          })
        }
      }

      if (body.status === 'printing') {
        const firstRow = oldRows?.[0] as Record<string, unknown> | undefined
        const customerEmail = String(order.email ?? firstRow?.email ?? '')
        const userId = String(order.groupId ?? firstRow?.user_id ?? '')
        const customerName = String(order.fullName ?? firstRow?.full_name ?? 'Customer')
        if (customerEmail) {
          const { sendProductionStarted } = await import('@/lib/email/triggers')
          sendProductionStarted(
            userId,
            customerEmail,
            order.orderNumber,
            customerName,
          ).catch((err) => {
            console.error('[api/admin/orders] Failed to enqueue ProductionStarted email:', err)
          })
        }
      }

      if (body.status === 'delivered') {
        const firstRow = oldRows?.[0] as Record<string, unknown> | undefined
        const customerEmail = String(order.email ?? firstRow?.email ?? '')
        const userId = String(order.groupId ?? firstRow?.user_id ?? '')
        const customerName = String(order.fullName ?? firstRow?.full_name ?? 'Customer')
        if (customerEmail) {
          const { sendDeliveryConfirmation } = await import('@/lib/email/triggers')
          sendDeliveryConfirmation(
            userId,
            customerEmail,
            order.orderNumber,
            customerName,
          ).catch((err) => {
            console.error('[api/admin/orders] Failed to enqueue DeliveryConfirmation email:', err)
          })
        }
      }

      return NextResponse.json({ order, emailTriggered: ['shipped', 'printing', 'delivered'].includes(body.status) })
    }

    // ── Notes update ──
    if ('notes' in body) {
      const { data: oldRows } = await supabase
        .from('orders')
        .select('id, group_id, notes')
        .or(`group_id.eq.${body.groupId},id.eq.${body.groupId}`)
      const order = await updateAdminOrderNotes(body.groupId, body.notes?.trim() ? body.notes.trim() : null)
      await logAdminAction({
        admin_id: auth.user.id,
        action: 'update_order_notes',
        target_type: 'order',
        target_id: body.groupId,
        old_value: oldRows ?? null,
        new_value: { notes: body.notes?.trim() || null },
      })
      return NextResponse.json({ order })
    }

    // ── Tracking update ──
    if (
      'tracking_number' in body ||
      'courier_name' in body ||
      'tracking_url' in body
    ) {
      const { data: oldRows } = await supabase
        .from('orders')
        .select('id, group_id, tracking_number, courier_name, tracking_url, status, full_name, email, user_id')
        .or(`group_id.eq.${body.groupId},id.eq.${body.groupId}`)

      const order = await updateAdminOrderTracking(body.groupId, {
        tracking_number: body.tracking_number,
        courier_name: body.courier_name,
        tracking_url: body.tracking_url,
      })

      await logAdminAction({
        admin_id: auth.user.id,
        action: 'update_order_tracking',
        target_type: 'order',
        target_id: body.groupId,
        old_value: oldRows ?? null,
        new_value: {
          tracking_number: body.tracking_number,
          courier_name: body.courier_name,
          tracking_url: body.tracking_url,
        },
      })

      // If order is already shipped and tracking was just added, trigger email
      const firstRow = oldRows?.[0] as Record<string, unknown> | undefined
      const currentStatus = String(order.status ?? firstRow?.status ?? '')
      if (currentStatus === 'shipped') {
        const trackingNumber = String(order.tracking_number ?? '')
        const courierName = String(order.courier_name ?? '')
        const trackingUrl = String(order.tracking_url ?? '')
        const customerEmail = String(order.email ?? firstRow?.email ?? '')
        const userId = String(order.groupId ?? firstRow?.user_id ?? '')
        const customerName = String(order.fullName ?? firstRow?.full_name ?? 'Customer')

        if (trackingNumber && courierName && customerEmail) {
          sendOrderShipped(
            userId,
            customerEmail,
            order.orderNumber,
            customerName,
            order.items.map((it) => ({
              name: it.fileName || '3D Print',
              material: order.material,
              color: order.color,
              quantity: it.quantity,
            })),
            trackingNumber,
            courierName,
            trackingUrl || '#',
          ).catch((err) => {
            console.error('[api/admin/orders] Failed to enqueue OrderShipped email:', err)
          })
        }
      }

      return NextResponse.json({ order })
    }

    return NextResponse.json({ error: 'Status, notes, or tracking fields are required.' }, { status: 400 })
  } catch (error) {
    if (error instanceof AdminOrderStatusTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return getAdminApiErrorResponse(error)
  }
}
