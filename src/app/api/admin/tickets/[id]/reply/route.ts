import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResendClient } from '@/lib/email/resend-client'
import { getBusinessSettings } from '@/lib/admin/business-settings'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { uploadSupportAttachment } from '@/lib/support/attachments'
import { logTicketEvent } from '@/lib/support/ticket-events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/tickets/[id]/reply
 *
 * Send a reply to a customer. Accepts multipart/form-data for attachments.
 * Fields:
 *   - message: string (required)
 *   - html: string (optional)
 *   - is_internal: "true" | "false" (optional, default false)
 *   - attachments: File[] (optional)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Parse multipart form data
    const formData = await req.formData()
    const message = formData.get('message') as string | null
    const html = formData.get('html') as string | null
    const isInternalRaw = formData.get('is_internal') as string | null
    const isInternal = isInternalRaw === 'true'

    if (!message || typeof message !== 'string') {
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

    // Collect attachments from formData
    const attachmentFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key === 'attachments' && value instanceof File) {
        attachmentFiles.push(value)
      }
    }

    // Validate attachment sizes (10 MB each)
    for (const file of attachmentFiles) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} exceeds 10 MB limit` }, { status: 400 })
      }
    }

    // Fetch admin profile
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

    // Build Resend attachments
    const resendAttachments: { filename: string; content: string }[] = []
    for (const file of attachmentFiles) {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      resendAttachments.push({ filename: file.name, content: base64 })
    }

    let emailResult: { data?: { id?: string } | null; error?: { message: string } | null } | null = null

    // Only send email if NOT internal note
    if (!isInternal) {
      const resend = await getResendClient()
      emailResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: ticket.customer_email,
        subject: `Re: ${ticket.subject}`,
        replyTo: fromEmail,
        html: html || `<p>${escapeHtml(message)}</p>`,
        text: message,
        ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
      })

      if (emailResult?.error) {
        console.error('[admin/ticket/reply] Resend send error:', emailResult.error.message, '| from:', fromEmail, '| to:', ticket.customer_email)
        return NextResponse.json(
          { error: `Email failed: ${emailResult.error.message}` },
          { status: 502 }
        )
      }
    }

    // Store message
    const { data: messageRow, error: msgError } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: id,
        sender_type: 'admin',
        sender_email: adminEmail,
        sender_name: adminName,
        body: message,
        html_body: html || `<p>${escapeHtml(message)}</p>`,
        resend_email_id: (emailResult?.data?.id as string) || null,
        is_internal: isInternal,
        direction: 'outbound',
        created_at: now,
      })
      .select()
      .single()

    if (msgError) throw msgError

    // Upload attachments to Supabase Storage and link to message
    if (messageRow && attachmentFiles.length > 0) {
      for (const file of attachmentFiles) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        try {
          const uploadResult = await uploadSupportAttachment(
            buffer,
            file.name,
            ticket.ticket_number,
            file.type || 'application/octet-stream'
          )
          await supabase.from('support_ticket_attachments').insert({
            message_id: messageRow.id,
            filename: file.name,
            content_type: file.type || 'application/octet-stream',
            size: file.size,
            storage_path: uploadResult.path,
            url: uploadResult.url,
          })
        } catch (uploadErr) {
          console.error('[admin/ticket/reply] Attachment upload failed:', uploadErr)
        }
      }
    }

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

    // Log event
    if (isInternal) {
      await logTicketEvent(id, 'internal_note.added', {
        performedBy: auth.user.id,
        metadata: { message_preview: message.slice(0, 200) },
      })
    } else {
      await logTicketEvent(id, 'admin.replied', {
        performedBy: auth.user.id,
        metadata: { message_preview: message.slice(0, 200) },
      })
    }

    return NextResponse.json({ success: true, message: messageRow })
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
