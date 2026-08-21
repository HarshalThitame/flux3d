import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResendClient } from '@/lib/email/resend-client'
import { getBusinessSettings } from '@/lib/admin/business-settings'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = (await req.json()) as { message: string; html?: string }
    const supabase = createAdminClient()

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Fetch admin profile for sender name
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name, name, email')
      .eq('id', auth.user.id)
      .maybeSingle()

    const adminName = adminProfile?.full_name || adminProfile?.name || 'Flux3D Support'
    const adminEmail = adminProfile?.email || 'complaints@flux3d.in'

    const businessSettings = await getBusinessSettings().catch(() => null)
    const fromEmail = businessSettings?.complaintsEmail || 'complaints@flux3d.in'
    const fromName = businessSettings?.resendSenderName || 'Flux3D Support'

    const now = new Date().toISOString()

    // Send email via Resend
    const resend = await getResendClient()
    const emailResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: ticket.customer_email,
      subject: `Re: ${ticket.subject}`,
      replyTo: fromEmail,
      html: body.html || `<p>${escapeHtml(body.message)}</p>`,
      text: body.message,
    })

    if (emailResult?.error) {
      console.error('[admin/ticket/reply] Resend send error:', emailResult.error.message, '| from:', fromEmail, '| to:', ticket.customer_email)
      return NextResponse.json(
        { error: `Email failed: ${emailResult.error.message}` },
        { status: 502 }
      )
    }

    // Store admin message
    const { data: message } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: id,
        sender_type: 'admin',
        sender_email: adminEmail,
        sender_name: adminName,
        body: body.message,
        html_body: body.html || `<p>${escapeHtml(body.message)}</p>`,
        resend_email_id: (emailResult?.data?.id as string) || null,
        created_at: now,
      })
      .select()
      .single()

    // Update ticket
    const statusUpdate = ticket.status === 'Open' ? 'In Progress' : ticket.status
    await supabase
      .from('support_tickets')
      .update({
        last_message_at: now,
        updated_at: now,
        status: statusUpdate,
      })
      .eq('id', id)

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
