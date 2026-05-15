import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminOrdersData, updateAdminOrderNotes, updateAdminOrderStatus } from '@/lib/admin/queries'
import { orderStatuses, type OrderStatus } from '@/lib/orders'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logAdminAction } from '@/lib/admin/auditLog'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getAdminOrdersData()
    return NextResponse.json({ orders: data })
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
        .select('id, group_id, status')
        .or(`group_id.eq.${body.groupId},id.eq.${body.groupId}`)
      const order = await updateAdminOrderStatus(body.groupId, body.status)
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
    return getAdminApiErrorResponse(error)
  }
}
