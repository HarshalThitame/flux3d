import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'

/**
 * GET /api/admin/tickets
 *
 * Query params:
 *   - status: Open | In Progress | Resolved | Closed
 *   - source: email | whatsapp | manual | contact_form
 *   - assigned_to: uuid | unassigned
 *   - query: search string (ticket_number, customer_email, customer_name, subject)
 *   - sort: column name (default: last_message_at)
 *   - page: number (default: 1)
 *   - limit: number (default: 50, max: 200)
 */
export async function GET(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const source = searchParams.get('source') || undefined
    const assignedTo = searchParams.get('assigned_to') || undefined
    const query = searchParams.get('query')?.trim() || undefined
    const sort = searchParams.get('sort') || 'last_message_at'
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50))
    const offset = (page - 1) * limit

    const supabase = createAdminClient()

    // Build the base query
    let dbQuery = supabase
      .from('support_tickets')
      .select('*, support_ticket_messages(count)', { count: 'exact' })

    if (status && status !== 'all') {
      dbQuery = dbQuery.eq('status', status)
    }

    if (source && source !== 'all') {
      dbQuery = dbQuery.eq('source', source)
    }

    if (assignedTo === 'unassigned') {
      dbQuery = dbQuery.is('assigned_to', null)
    } else if (assignedTo) {
      dbQuery = dbQuery.eq('assigned_to', assignedTo)
    }

    if (query) {
      // Search across ticket fields
      const ilikePattern = `%${query}%`
      dbQuery = dbQuery.or(
        `ticket_number.ilike.${ilikePattern},customer_email.ilike.${ilikePattern},customer_name.ilike.${ilikePattern},subject.ilike.${ilikePattern}`
      )
    }

    const sortColumn = sort === 'created_at' ? 'created_at' : 'last_message_at'
    dbQuery = dbQuery.order(sortColumn, { ascending: false })

    // Pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1)

    const { data, error, count } = await dbQuery

    if (error) throw new Error(error.message)

    // If query didn't find matches in ticket fields, also search message bodies
    let extraTicketIds: string[] = []
    if (query && (!data || data.length < limit)) {
      const { data: msgMatches } = await supabase
        .from('support_ticket_messages')
        .select('ticket_id')
        .ilike('body', `%${query}%`)
        .limit(50)

      if (msgMatches && msgMatches.length > 0) {
        extraTicketIds = [...new Set(msgMatches.map((m) => m.ticket_id))]
      }
    }

    // Combine results if we have extra matches from message search
    let combined = data ?? []
    if (extraTicketIds.length > 0 && query) {
      const existingIds = new Set(combined.map((t) => t.id))
      const missingIds = extraTicketIds.filter((id) => !existingIds.has(id))

      if (missingIds.length > 0) {
        const { data: extraTickets } = await supabase
          .from('support_tickets')
          .select('*, support_ticket_messages(count)')
          .in('id', missingIds)
          .limit(limit)

        if (extraTickets) {
          combined = [...combined, ...extraTickets]
        }
      }
    }

    const tickets = combined.map((t) => ({
      id: String(t.id),
      ticketNumber: t.ticket_number ?? String(t.id),
      customer: t.customer_name ?? 'Unknown',
      customerEmail: t.customer_email,
      customerPhone: t.customer_phone,
      subject: t.subject ?? '',
      category: t.category ?? 'Other',
      priority: t.priority ?? 'Normal',
      status: t.status ?? 'Open',
      assignedTo: t.assigned_to,
      source: t.source ?? 'manual',
      orderId: t.order_id,
      messageCount: (t as Record<string, unknown>).support_ticket_messages ?? 0,
      lastMessageAt: t.last_message_at ?? t.created_at ?? '',
      created: t.created_at ?? '',
      lastUpdated: t.updated_at ?? t.created_at ?? '',
    }))

    return NextResponse.json({
      tickets,
      total: count ?? tickets.length,
      page,
      limit,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
