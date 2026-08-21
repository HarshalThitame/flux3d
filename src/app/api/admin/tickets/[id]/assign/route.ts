import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { logTicketEvent } from '@/lib/support/ticket-events'

/**
 * POST /api/admin/tickets/[id]/assign
 *
 * Assign a ticket to an admin user.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = (await req.json()) as { assigned_to: string | null }
    const supabase = createAdminSupabaseClient()

    // Validate assigned_to is a real admin if provided
    if (body.assigned_to) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, full_name, name')
        .eq('id', body.assigned_to)
        .maybeSingle()

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Assigned user is not an admin' }, { status: 400 })
      }
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: body.assigned_to || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    await logTicketEvent(id, 'ticket.assigned', {
      newValue: { assigned_to: body.assigned_to },
      performedBy: auth.user.id,
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
