import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { logTicketEvent } from '@/lib/support/ticket-events'

/**
 * POST /api/admin/tickets/[id]/notes
 *
 * Add an internal note to a ticket. Not sent to the customer.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = (await req.json()) as { message: string }
    const supabase = createAdminSupabaseClient()

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Fetch admin profile
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name, name, email')
      .eq('id', auth.user.id)
      .maybeSingle()

    const adminName = adminProfile?.full_name || adminProfile?.name || 'Flux3D Support'
    const adminEmail = adminProfile?.email || 'complaints@flux3d.in'
    const now = new Date().toISOString()

    // Insert internal note
    const { data: message, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: id,
        sender_type: 'admin',
        sender_email: adminEmail,
        sender_name: adminName,
        body: body.message,
        html_body: `<p>${escapeHtml(body.message)}</p>`,
        is_internal: true,
        direction: 'outbound',
        created_at: now,
      })
      .select()
      .single()

    if (error) throw error

    // Update ticket timestamp
    await supabase
      .from('support_tickets')
      .update({ updated_at: now })
      .eq('id', id)

    await logTicketEvent(id, 'internal_note.added', {
      performedBy: auth.user.id,
      metadata: { message_preview: body.message.slice(0, 200) },
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
