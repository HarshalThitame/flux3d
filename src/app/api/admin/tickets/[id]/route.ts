import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const { data: messages, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    const messageIds = (messages || []).map((m) => m.id)
    let attachments: Array<Record<string, unknown>> = []
    if (messageIds.length > 0) {
      const { data: atts } = await supabase
        .from('support_ticket_attachments')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true })
      attachments = atts || []
    }

    // Fetch assigned admin name if any
    let assignedToName = null
    if (ticket.assigned_to) {
      const { data: admin } = await supabase
        .from('profiles')
        .select('full_name, name')
        .eq('id', ticket.assigned_to)
        .maybeSingle()
      assignedToName = admin?.full_name || admin?.name || null
    }

    // Fetch linked order if any
    let order = null
    if (ticket.order_id) {
      const { data: orderRow } = await supabase
        .from('orders')
        .select('id, order_number, status, grand_total, created_at')
        .eq('id', ticket.order_id)
        .maybeSingle()
      if (orderRow) order = orderRow
    }

    // Fetch ticket events (audit trail)
    const { data: events } = await supabase
      .from('support_ticket_events')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    // Fetch admin names for events
    const performerIds = [...new Set((events || []).map((e) => e.performed_by).filter(Boolean))]
    const performerNames: Record<string, string> = {}
    if (performerIds.length > 0) {
      const { data: performers } = await supabase
        .from('profiles')
        .select('id, full_name, name')
        .in('id', performerIds)
      performers?.forEach((p) => {
        performerNames[p.id] = p.full_name || p.name || 'System'
      })
    }

    const eventsWithNames = (events || []).map((e) => ({
      ...e,
      performedByName: e.performed_by ? (performerNames[e.performed_by] || 'System') : 'System',
    }))

    return NextResponse.json({
      ticket: {
        ...ticket,
        assignedToName,
      },
      messages: messages || [],
      attachments: attachments || [],
      order,
      events: eventsWithNames,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = (await req.json()) as Record<string, unknown>
    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status) updates.status = body.status
    if (body.priority) updates.priority = body.priority
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to || null
    if (body.category) updates.category = body.category
    if (body.subject) updates.subject = body.subject
    if (body.order_id !== undefined) updates.order_id = body.order_id || null

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
