import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBusinessSettings } from '@/lib/admin/business-settings'
import { verifyResendWebhookSignature } from '@/lib/email/webhook-verification'
import { getResendClient } from '@/lib/email/resend-client'
import { uploadSupportAttachment, downloadAttachmentBytes } from '@/lib/support/attachments'
import { logTicketEvent } from '@/lib/support/ticket-events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COMPLAINTS_EMAIL = 'complaints@flux3d.in'

interface ResendInboundPayload {
  type: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    message_id?: string
    headers?: Array<{ name?: string; value?: string }>
    attachments?: Array<{
      filename: string
      content_type: string
      size: number
      url?: string
    }>
  }
  id: string
  created_at: number
}

interface ResendEmailDetail {
  id: string
  from: string
  to: string[]
  subject: string
  html?: string
  text?: string
  headers?: Array<{ name?: string; value?: string }>
  message_id?: string
  attachments?: Array<{
    filename: string
    content_type: string
    size: number
    url?: string
  }>
}

/**
 * GET diagnostic endpoint
 */
export async function GET() {
  const checks: Record<string, string> = {}

  checks.env_webhook_secret = process.env.RESEND_WEBHOOK_SECRET ? 'configured' : 'missing'

  try {
    const settings = await getBusinessSettings().catch(() => null)
    checks.db_webhook_secret = settings?.resendWebhookSecret ? 'configured' : 'missing'
    checks.db_sender_email = settings?.resendSenderEmail || 'fallback'
    checks.db_complaints_email = settings?.complaintsEmail || 'fallback'
  } catch {
    checks.db_settings = 'error'
  }

  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('support_tickets').select('id').limit(1)
    checks.supabase = data !== undefined ? 'connected' : 'error'
  } catch {
    checks.supabase = 'error'
  }

  try {
    await getResendClient()
    checks.resend_api = 'key_valid'
  } catch {
    checks.resend_api = 'key_invalid_or_missing'
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/resend/inbound',
    expected_method: 'POST',
    note: 'Configure this URL in Resend Dashboard -> Domains -> flux3d.in -> Receiving -> Webhook URL',
    checks,
  })
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('svix-signature')
  const timestampHeader = req.headers.get('svix-timestamp')
  const svixIdHeader = req.headers.get('svix-id')

  console.log('[webhooks/resend/inbound] Received webhook', {
    svixId: svixIdHeader,
    timestamp: timestampHeader,
    bodyLength: rawBody.length,
    hasSignature: !!signatureHeader,
  })

  try {
    const settings = await getBusinessSettings().catch(() => null)
    const secret =
      settings?.resendWebhookSecret ||
      process.env.RESEND_WEBHOOK_SECRET ||
      ''

    if (!secret) {
      console.warn('[webhooks/resend/inbound] Webhook secret not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
    }

    const signatureValid = verifyResendWebhookSignature(
      rawBody,
      signatureHeader,
      timestampHeader,
      svixIdHeader,
      secret
    )

    if (!signatureValid) {
      console.warn('[webhooks/resend/inbound] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let event: ResendInboundPayload
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    console.log('[webhooks/resend/inbound] Event type:', event.type, 'email_id:', event.data?.email_id)

    if (event.type !== 'email.received') {
      return NextResponse.json({ received: true, note: 'ignored_non_inbound_event' })
    }

    const eventData = event.data
    const emailId = eventData.email_id
    const fromRaw = eventData.from
    const toAddresses = eventData.to || []
    const subject = eventData.subject || '(No subject)'
    const messageId = eventData.message_id
    const headers = eventData.headers || []

    // ── 1. Recipient filter: only process emails TO complaints@flux3d.in ──
    const primaryRecipient = toAddresses[0]?.toLowerCase() || ''
    const isComplaints = primaryRecipient.includes('complaints') || primaryRecipient === COMPLAINTS_EMAIL
    if (!isComplaints) {
      console.log('[webhooks/resend/inbound] Ignored: recipient is not complaints inbox:', primaryRecipient)
      return NextResponse.json({ received: true, note: 'ignored_non_complaints_recipient' })
    }

    // ── 2. Idempotency: check if this email was already processed ──
    const supabase = createAdminClient()
    const { data: existingMsg } = await supabase
      .from('support_ticket_messages')
      .select('id')
      .eq('resend_email_id', emailId)
      .maybeSingle()

    if (existingMsg) {
      console.log('[webhooks/resend/inbound] Duplicate webhook ignored:', emailId)
      return NextResponse.json({ received: true, note: 'duplicate_ignored' })
    }

    // Parse from address
    let fromEmail = fromRaw.trim()
    let fromName = ''
    const bracketMatch = fromRaw.match(/^(?:"?([^"<>]+)"?\s*)?<([^<>\s]+@[^<>\s]+)>$/)
    if (bracketMatch) {
      fromName = (bracketMatch[1] || '').trim().replace(/^"|"$/g, '')
      fromEmail = bracketMatch[2].trim()
    } else {
      const emailMatch = fromRaw.match(/^([^<>\s]+@[^<>\s]+)$/)
      if (emailMatch) {
        fromEmail = emailMatch[1].trim()
      }
    }

    // Extract threading headers
    const inReplyTo = headers.find((h) => h.name?.toLowerCase() === 'in-reply-to')?.value || ''
    const references = headers.find((h) => h.name?.toLowerCase() === 'references')?.value || ''

    // Fetch full email content from Resend
    const fullEmail = await fetchResendEmail(emailId)
    const htmlBody = fullEmail?.html || ''
    const textBody = fullEmail?.text || ''
    const emailMessageId = fullEmail?.message_id || messageId || ''

    // ── 3. Find existing ticket ──
    let ticketId: string | null = null

    if (inReplyTo) {
      const cleanInReplyTo = inReplyTo.trim().replace(/^<|>$/g, '')
      const { data: msg } = await supabase
        .from('support_ticket_messages')
        .select('ticket_id')
        .eq('message_id', cleanInReplyTo)
        .maybeSingle()
      if (msg?.ticket_id) ticketId = msg.ticket_id
    }

    if (!ticketId && references) {
      const refIds = references.split(/\s+/).filter(Boolean).map((r) => r.trim().replace(/^<|>$/g, ''))
      for (const refId of refIds) {
        const { data: msg } = await supabase
          .from('support_ticket_messages')
          .select('ticket_id')
          .eq('message_id', refId)
          .maybeSingle()
        if (msg?.ticket_id) {
          ticketId = msg.ticket_id
          break
        }
      }
    }

    if (!ticketId) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, subject')
        .eq('customer_email', fromEmail)
        .in('status', ['Open', 'In Progress'])
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(3)

      if (tickets && tickets.length > 0) {
        const baseSubject = subject.replace(/^Re:\s*/i, '').trim().toLowerCase()
        const match = tickets.find((t) => {
          const ticketSubject = (t.subject || '').replace(/^Re:\s*/i, '').trim().toLowerCase()
          return ticketSubject === baseSubject || baseSubject.includes(ticketSubject) || ticketSubject.includes(baseSubject)
        })
        if (match) ticketId = match.id
      }
    }

    // ── 4. Find user profile ──
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number')
      .eq('email', fromEmail)
      .maybeSingle()

    const userId = profile?.id || null
    const customerName = fromName || profile?.full_name || fromEmail.split('@')[0]
    const customerPhone = profile?.phone_number || null

    // ── 5. Try to extract order number from subject/body ──
    let linkedOrderId: string | null = null
    const orderNumberMatch =
      subject.match(/\b(ORD-\d+|FLX-\d+|SHP-\d+)\b/) ||
      textBody.match(/\b(ORD-\d+|FLX-\d+|SHP-\d+)\b/)
    if (orderNumberMatch) {
      const orderNumber = orderNumberMatch[1]
      const { data: orderRow } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle()
      if (orderRow?.id) linkedOrderId = orderRow.id
    }

    const now = new Date().toISOString()

    if (ticketId) {
      // ── Append to existing ticket ──
      const { data: message, error: msgError } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'customer',
          sender_email: fromEmail,
          sender_name: customerName,
          body: textBody,
          html_body: htmlBody,
          resend_email_id: emailId,
          message_id: emailMessageId,
          in_reply_to: inReplyTo || null,
          direction: 'inbound',
          created_at: now,
        })
        .select()
        .single()

      if (msgError) {
        // If unique constraint violation on resend_email_id, it's a race-condition duplicate
        if (msgError.code === '23505') {
          console.log('[webhooks/resend/inbound] Race-condition duplicate ignored:', emailId)
          return NextResponse.json({ received: true, note: 'duplicate_ignored' })
        }
        throw msgError
      }

      if (message) {
        const ticketRow = await supabase.from('support_tickets').select('ticket_number').eq('id', ticketId).single()
        await saveAttachments(supabase, message.id, fullEmail?.attachments || [], emailId, ticketRow.data?.ticket_number)
      }

      await supabase
        .from('support_tickets')
        .update({ last_message_at: now, updated_at: now, status: 'In Progress' })
        .eq('id', ticketId)

      await logTicketEvent(ticketId, 'customer.replied', {
        metadata: { from_email: fromEmail, subject: subject.slice(0, 200) },
      })

      console.log('[webhooks/resend/inbound] Appended to ticket:', ticketId)
    } else {
      // ── Create new ticket ──
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          customer_email: fromEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          subject: subject.replace(/^Re:\s*/i, '').trim(),
          category: 'Other',
          priority: 'Normal',
          status: 'Open',
          source: 'email',
          resend_email_id: emailId,
          message_id: emailMessageId,
          in_reply_to: inReplyTo || null,
          order_id: linkedOrderId,
          last_message_at: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (ticketError || !ticket) {
        console.error('[webhooks/resend/inbound] Failed to create ticket:', ticketError)
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
      }

      ticketId = ticket.id

      const { data: message, error: msgError } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'customer',
          sender_email: fromEmail,
          sender_name: customerName,
          body: textBody,
          html_body: htmlBody,
          resend_email_id: emailId,
          message_id: emailMessageId,
          in_reply_to: inReplyTo || null,
          direction: 'inbound',
          created_at: now,
        })
        .select()
        .single()

      if (msgError) {
        if (msgError.code === '23505') {
          console.log('[webhooks/resend/inbound] Race-condition duplicate ignored:', emailId)
          return NextResponse.json({ received: true, note: 'duplicate_ignored' })
        }
        throw msgError
      }

      if (message) {
        await saveAttachments(supabase, message.id, fullEmail?.attachments || [], emailId, ticket.ticket_number)
      }

      if (ticketId) {
        await logTicketEvent(ticketId, 'ticket.created', {
          metadata: { from_email: fromEmail, subject: subject.slice(0, 200), source: 'email' },
        })
      }

      // Send auto-acknowledgment FROM complaints@flux3d.in
      await sendTicketAcknowledgment(ticket.ticket_number, fromEmail, customerName, subject)
      console.log('[webhooks/resend/inbound] Created ticket:', ticket.ticket_number, 'for:', fromEmail)
    }

    return NextResponse.json({ received: true, ticket_id: ticketId })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Inbound webhook error'
    console.error('[webhooks/resend/inbound] Error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

async function fetchResendEmail(emailId: string): Promise<ResendEmailDetail | null> {
  try {
    const resend = await getResendClient()
    const result = await resend.emails.get(emailId)
    if (result?.data) {
      return result.data as ResendEmailDetail
    }
  } catch (err) {
    console.warn('[webhooks/resend/inbound] Failed to fetch email detail:', err)
  }
  return null
}

async function saveAttachments(
  supabase: ReturnType<typeof createAdminClient>,
  messageId: string,
  attachments: Array<{ filename: string; content_type: string; size: number; url?: string }>,
  emailId: string,
  ticketNumber?: string
) {
  if (!attachments || attachments.length === 0) return

  for (const att of attachments) {
    let storagePath: string | null = null
    let publicUrl: string | null = null

    // Eager download: if a download URL is available, fetch bytes and upload to Storage
    if (att.url && ticketNumber) {
      const buffer = await downloadAttachmentBytes(att.url)
      if (buffer) {
        try {
          const result = await uploadSupportAttachment(buffer, att.filename, ticketNumber, att.content_type)
          storagePath = result.path
          publicUrl = result.url
        } catch (uploadErr) {
          console.warn('[webhooks/resend/inbound] Attachment upload failed:', uploadErr)
        }
      }
    }

    // Fallback: store reference if download/upload failed
    if (!storagePath) {
      storagePath = `resend-pending:${emailId}:${att.filename}`
    }

    const { error } = await supabase.from('support_ticket_attachments').insert({
      message_id: messageId,
      filename: att.filename,
      content_type: att.content_type,
      size: att.size,
      storage_path: storagePath,
      url: publicUrl,
    })

    if (error) {
      console.error('[webhooks/resend/inbound] Failed to save attachment record:', error.message)
    }
  }
}

async function sendTicketAcknowledgment(
  ticketNumber: string,
  customerEmail: string,
  customerName: string,
  originalSubject: string
) {
  try {
    const businessSettings = await getBusinessSettings().catch(() => null)
    const complaintsEmail = businessSettings?.complaintsEmail || 'complaints@flux3d.in'
    const fromName = businessSettings?.resendSenderName || 'Flux3D Support'

    const subject = `We received your request — ${ticketNumber}`
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6d28d9;">Hi ${customerName || 'there'},</h2>
        <p>We have received your support request and created ticket <strong>${ticketNumber}</strong>.</p>
        <p><strong>Subject:</strong> ${originalSubject}</p>
        <p>Our team will review your request and get back to you shortly.</p>
        <p>You can simply reply to this email to continue the conversation.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">Regards,<br />${fromName}</p>
      </div>
    `

    const resend = await getResendClient()
    const sendResult = await resend.emails.send({
      from: `${fromName} <${complaintsEmail}>`,
      to: customerEmail,
      subject,
      html,
      replyTo: complaintsEmail,
    })

    if (sendResult?.error) {
      console.error(
        '[webhooks/resend/inbound] Resend error sending acknowledgment:',
        sendResult.error.message,
        '| from:', complaintsEmail,
        '| to:', customerEmail
      )
    } else {
      console.log('[webhooks/resend/inbound] Acknowledgment sent to:', customerEmail, 'ticket:', ticketNumber, 'id:', sendResult?.data?.id)
    }
  } catch (err) {
    console.warn('[webhooks/resend/inbound] Failed to send acknowledgment:', err)
  }
}
