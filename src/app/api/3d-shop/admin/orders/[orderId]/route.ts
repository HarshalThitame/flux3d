import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendOrderShipped } from '@/lib/email/triggers'
import {
  assertFulfilmentStatusTransition,
  assertShopStatusTransition,
  mapShopAdminOrder,
  mapShopPaymentAttempt,
  shopFulfilmentStatuses,
  shopOrderStatuses,
  type ShopFulfilmentStatus,
  type ShopOrderCustomer,
  type ShopOrderStatus,
} from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

type PatchBody = {
  order_status?: unknown
  tracking_number?: unknown
  courier_name?: unknown
  tracking_url?: unknown
  estimated_delivery?: unknown
  admin_notes?: unknown
  cancellation_reason?: unknown
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  phone_number: string | null
}

function textOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function dateOrNull(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim()
}

async function getCustomer(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  row: Record<string, unknown>
): Promise<ShopOrderCustomer> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone_number')
    .eq('id', String(row.user_id))
    .maybeSingle()

  const profile = data as ProfileRow | null
  const address = row.shipping_address && typeof row.shipping_address === 'object'
    ? row.shipping_address as Record<string, unknown>
    : {}

  return {
    id: String(row.user_id),
    name: profile?.full_name ?? (address.name ? String(address.name) : null),
    email: profile?.email ?? null,
    phone: profile?.phone_number ?? (address.phone ? String(address.phone) : null),
  }
}

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminPermission('orders.view')
  if ('response' in auth) return auth.response

  try {
    const { orderId } = await context.params
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    let paymentAttempt: ReturnType<typeof mapShopPaymentAttempt> | null = null
    const attemptId = data.payment_attempt_id ? String(data.payment_attempt_id) : null
    if (attemptId) {
      const { data: attemptRow } = await supabase
        .from('payment_attempts')
        .select('id, status, payment_method, failure_code, failure_description, attempt_number, metadata, created_at')
        .eq('id', attemptId)
        .maybeSingle()
      paymentAttempt = mapShopPaymentAttempt(attemptRow as Record<string, unknown> | null)
    }

    return NextResponse.json({
      order: mapShopAdminOrder(data, await getCustomer(supabase, data)),
      paymentAttempt,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminPermission('orders.update')
  if ('response' in auth) return auth.response

  try {
    const { orderId } = await context.params
    const body = (await request.json()) as PatchBody
    const supabase = createAdminSupabaseClient()
    const { data: current, error: loadError } = await supabase
      .from('shelf_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (loadError) throw new Error(loadError.message)
    if (!current) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const updates: Record<string, string | null> = {}
    let shouldRestoreStock = false
    let isCancellation = false
    let cancellationReason: string | null = null

    if ('order_status' in body) {
      const nextStatus = String(body.order_status) as ShopOrderStatus
      if (!shopOrderStatuses.includes(nextStatus)) {
        return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 })
      }

      const currentStatus = current.order_status as ShopOrderStatus
      try {
        assertShopStatusTransition(currentStatus, nextStatus)
      } catch (transitionError) {
        return NextResponse.json(
          { error: transitionError instanceof Error ? transitionError.message : 'Invalid status transition.' },
          { status: 400 }
        )
      }

      if (nextStatus === 'cancelled' && currentStatus !== 'cancelled') {
        const reason = textOrNull(body.cancellation_reason)
        if (!reason) return NextResponse.json({ error: 'Cancellation reason is required.' }, { status: 400 })
        cancellationReason = reason
        isCancellation = true
        // Don't add order_status to updates — cancel_shelf_order RPC handles it
        shouldRestoreStock = true
      } else {
        updates.order_status = nextStatus
        if (nextStatus === 'returned' && currentStatus !== 'returned') {
          shouldRestoreStock = true
        }
      }
    }

    if ('tracking_number' in body) updates.tracking_number = textOrNull(body.tracking_number)
    if ('courier_name' in body) updates.courier_name = textOrNull(body.courier_name)
    if ('tracking_url' in body) updates.tracking_url = textOrNull(body.tracking_url)
    if ('estimated_delivery' in body) updates.estimated_delivery = dateOrNull(body.estimated_delivery)
    if ('admin_notes' in body) updates.admin_notes = textOrNull(body.admin_notes)

    if ('fulfilment_status' in body) {
      const nextFulfilment = String(body.fulfilment_status) as ShopFulfilmentStatus
      if (!shopFulfilmentStatuses.includes(nextFulfilment)) {
        return NextResponse.json({ error: 'Invalid fulfilment status.' }, { status: 400 })
      }
      const currentFulfilment = current.fulfilment_status as ShopFulfilmentStatus
      try {
        assertFulfilmentStatusTransition(currentFulfilment, nextFulfilment)
      } catch (transitionError) {
        return NextResponse.json(
          { error: transitionError instanceof Error ? transitionError.message : 'Invalid fulfilment transition.' },
          { status: 400 }
        )
      }
      updates.fulfilment_status = nextFulfilment
    }

    // For cancellations, skip the regular order update (RPC handles it)
    if (!isCancellation && Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    if (isCancellation) {
      // Transactional cancellation — stock restore + coupon decrement + status update
      const { error: cancelError } = await supabase.rpc('cancel_shelf_order', {
        p_order_id: orderId,
        p_reason: cancellationReason,
      })
      if (cancelError) throw new Error(cancelError.message)
    } else {
      // Regular update for non-cancellation status changes
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('shelf_orders')
          .update(updates)
          .eq('id', orderId)
          .select('*')
          .single()
        if (updateError) throw new Error(updateError.message)
      }

      await logAdminAction({
        admin_id: auth.user.id,
        action: 'update_shop_order',
        target_type: 'order',
        target_id: orderId,
        old_value: { order_status: current.order_status, ...current },
        new_value: updates,
      }).catch(() => {})

      // ── Trigger OrderShipped email ──
      const currentFulfilment = String(current.fulfilment_status ?? '')
      const newFulfilment = String(updates.fulfilment_status ?? currentFulfilment)
      const wasShipped = currentFulfilment === 'shipped' || newFulfilment === 'shipped'
      const hasTracking = updates.tracking_number || updates.courier_name || updates.tracking_url

      if (wasShipped && hasTracking) {
        const customer = await getCustomer(supabase, current)
        const customerEmail = customer.email
        const orderNumber = String(current.order_number ?? '')
        const customerName = customer.name ?? 'Customer'
        const items = (Array.isArray(current.items) ? current.items : []).map((it: Record<string, unknown>) => ({
          name: String(it.productName ?? it.product_name ?? it.name ?? 'Product'),
          material: String(it.material ?? ''),
          color: String(it.variantLabel ?? it.color ?? ''),
          quantity: Number(it.quantity ?? 1),
        }))
        const trackingNumber = String(updates.tracking_number ?? current.tracking_number ?? '')
        const courierName = String(updates.courier_name ?? current.courier_name ?? '')
        const trackingUrl = String(updates.tracking_url ?? current.tracking_url ?? '')

        if (trackingNumber && courierName && customerEmail) {
          sendOrderShipped(
            String(current.user_id),
            customerEmail,
            orderNumber,
            customerName,
            items,
            trackingNumber,
            courierName,
            trackingUrl || '#',
          ).catch((err) => {
            console.error('[3d-shop/admin/orders] Failed to enqueue OrderShipped email:', err)
          })
        }
      }
    }

    if (shouldRestoreStock && !isCancellation) {
      // returned — restore stock only (no coupon decrement for returns)
      const { error: restoreError } = await supabase.rpc('restore_shelf_order_stock', {
        p_items: current.items ?? [],
        p_order_id: orderId,
      })
      if (restoreError) throw new Error(restoreError.message)
    }

    const { data: refreshed } = await supabase
      .from('shelf_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    let paymentAttempt: ReturnType<typeof mapShopPaymentAttempt> | null = null
    const attemptId = refreshed?.payment_attempt_id ? String(refreshed.payment_attempt_id) : null
    if (attemptId) {
      const { data: attemptRow } = await supabase
        .from('payment_attempts')
        .select('id, status, payment_method, failure_code, failure_description, attempt_number, metadata, created_at')
        .eq('id', attemptId)
        .maybeSingle()
      paymentAttempt = mapShopPaymentAttempt(attemptRow as Record<string, unknown> | null)
    }

    return NextResponse.json({
      order: mapShopAdminOrder(refreshed ?? current, await getCustomer(supabase, refreshed ?? current)),
      paymentAttempt,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
