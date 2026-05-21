import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import {
  assertShopStatusTransition,
  mapShopAdminOrder,
  shopOrderStatuses,
  shopPaymentStatuses,
  type ShopOrderCustomer,
  type ShopOrderStatus,
  type ShopPaymentStatus,
} from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

type PatchBody = {
  order_status?: unknown
  tracking_number?: unknown
  courier_name?: unknown
  tracking_url?: unknown
  estimated_delivery?: unknown
  admin_notes?: unknown
  payment_status?: unknown
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
  const auth = await requireAdminRequest()
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

    return NextResponse.json({ order: mapShopAdminOrder(data, await getCustomer(supabase, data)) })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminRequest()
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
        updates.cancellation_reason = reason
        shouldRestoreStock = true
      }

      if (nextStatus === 'returned' && currentStatus !== 'returned') {
        shouldRestoreStock = true
      }

      updates.order_status = nextStatus
    }

    if ('payment_status' in body) {
      const paymentStatus = String(body.payment_status) as ShopPaymentStatus
      if (!shopPaymentStatuses.includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 })
      }
      updates.payment_status = paymentStatus
    }

    if ('tracking_number' in body) updates.tracking_number = textOrNull(body.tracking_number)
    if ('courier_name' in body) updates.courier_name = textOrNull(body.courier_name)
    if ('tracking_url' in body) updates.tracking_url = textOrNull(body.tracking_url)
    if ('estimated_delivery' in body) updates.estimated_delivery = dateOrNull(body.estimated_delivery)
    if ('admin_notes' in body) updates.admin_notes = textOrNull(body.admin_notes)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('shelf_orders')
      .update(updates)
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateError) throw new Error(updateError.message)

    if (shouldRestoreStock) {
      const { error: restoreError } = await supabase.rpc('restore_shelf_order_stock', {
        p_items: current.items ?? [],
      })
      if (restoreError) throw new Error(restoreError.message)
    }

    return NextResponse.json({ order: mapShopAdminOrder(updated, await getCustomer(supabase, updated)) })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
