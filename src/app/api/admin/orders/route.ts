import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import {
  AdminOrderStatusTransitionError,
  getAdminOrdersData,
  updateAdminOrderNotes,
  updateAdminOrderStatus,
} from '@/lib/admin/queries'
import { orderStatuses, type OrderStatus } from '@/lib/orders'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logAdminAction } from '@/lib/admin/auditLog'

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
    }

    if (!body.groupId) {
      return NextResponse.json({ error: 'Group id is required.' }, { status: 400 })
    }

    if (body.status && !orderStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    if (body.status) {
      const supabase = createAdminSupabaseClient()
      const { data: oldRows } = await supabase
        .from('orders')
        .select('id, group_id, status, status_timestamps')
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
      return NextResponse.json({ order })
    }

    if ('notes' in body) {
      const supabase = createAdminSupabaseClient()
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

    return NextResponse.json({ error: 'Status or notes are required.' }, { status: 400 })
  } catch (error) {
    if (error instanceof AdminOrderStatusTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return getAdminApiErrorResponse(error)
  }
}
