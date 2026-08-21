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

    return NextResponse.json({
      ticket: {
        ...ticket,
        assignedToName,
      },
      messages: messages || [],
      attachments: attachments || [],
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
    if (body.assigned_to) updates.assigned_to = body.assigned_to
    if (body.category) updates.category = body.category
    if (body.subject) updates.subject = body.subject

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
