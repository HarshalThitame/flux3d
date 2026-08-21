import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBusinessSettings } from '@/lib/admin/business-settings'
import { verifyResendWebhookSignature } from '@/lib/email/webhook-verification'
import { getResendClient } from '@/lib/email/resend-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  }>
}

/**
 * GET diagnostic endpoint — verify the webhook is reachable
 */
export async function GET() {
  const checks: Record<string, string> = {}

  // 1. Check env var
  checks.env_webhook_secret = process.env.RESEND_WEBHOOK_SECRET ? 'configured' : 'missing'

  // 2. Check DB settings
  try {
    const settings = await getBusinessSettings().catch(() => null)
    checks.db_webhook_secret = settings?.resendWebhookSecret ? 'configured' : 'missing'
    checks.db_sender_email = settings?.resendSenderEmail || 'fallback'
    checks.db_complaints_email = settings?.complaintsEmail || 'fallback'
  } catch {
    checks.db_settings = 'error'
  }

  // 3. Check Supabase connection
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('support_tickets').select('id').limit(1)
    checks.supabase = data !== undefined ? 'connected' : 'error'
  } catch {
    checks.supabase = 'error'
  }

  // 4. Check Resend API key
  try {
    const resend = await getResendClient()
    // Just verify the client initializes
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

  // Log every incoming request for debugging
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
      console.warn('[webhooks/resend/inbound] Invalid signature', {
        svixId: svixIdHeader,
        timestamp: timestampHeader,
        signaturePrefix: signatureHeader?.slice(0, 20),
      })
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

    // DEBUG: Log raw payload
    console.log('[webhooks/resend/inbound] RAW PAYLOAD:', {
      fromRaw,
      toAddresses,
      subject,
      messageId,
      headersCount: headers.length,
    })

    // Parse from address: "Name <email@domain.com>" or just "email@domain.com"
    // Try multiple patterns for robustness
    let fromEmail = fromRaw.trim()
    let fromName = ''

    // Pattern 1: "Name" <email> or Name <email>
    const bracketMatch = fromRaw.match(/^(?:"?([^"<>]+)"?\s*)?<([^<>\s]+@[^<>\s]+)>$/)
    if (bracketMatch) {
      fromName = (bracketMatch[1] || '').trim().replace(/^"|"$/g, '')
      fromEmail = bracketMatch[2].trim()
    } else {
      // Pattern 2: Just email (no brackets)
      const emailMatch = fromRaw.match(/^([^<>\s]+@[^<>\s]+)$/)
      if (emailMatch) {
        fromEmail = emailMatch[1].trim()
        fromName = ''
      }
    }

    console.log('[webhooks/resend/inbound] PARSED FROM:', { fromName, fromEmail, original: fromRaw })

    // Extract threading headers
    const inReplyTo = headers.find((h) => h.name?.toLowerCase() === 'in-reply-to')?.value || ''
    const references = headers.find((h) => h.name?.toLowerCase() === 'references')?.value || ''

    // Fetch full email content from Resend
    const fullEmail = await fetchResendEmail(emailId)

    const htmlBody = fullEmail?.html || ''
    const textBody = fullEmail?.text || ''
    const emailMessageId = fullEmail?.message_id || messageId || ''

    const supabase = createAdminClient()

    // Try to find existing ticket by threading
    let ticketId: string | null = null

    // 1. Match by In-Reply-To message ID
    if (inReplyTo) {
      const cleanInReplyTo = inReplyTo.trim().replace(/^<|>$/g, '')
      const { data: msg } = await supabase
        .from('support_ticket_messages')
        .select('ticket_id')
        .eq('message_id', cleanInReplyTo)
        .maybeSingle()
      if (msg?.ticket_id) {
        ticketId = msg.ticket_id
      }
    }

    // 2. Match by References header
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

    // 3. Match by open ticket from same customer within last 7 days with similar subject
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
        if (match) {
          ticketId = match.id
        }
      }
    }

    // 4. Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number')
      .eq('email', fromEmail)
      .maybeSingle()

    const userId = profile?.id || null
    const customerName = fromName || profile?.full_name || fromEmail.split('@')[0]
    const customerPhone = profile?.phone_number || null

    // Determine category based on recipient address
    const receivingAddress = toAddresses[0]?.toLowerCase() || ''
    let category = 'Other'
    if (receivingAddress.includes('complaints')) {
      category = 'Order Issue'
    } else if (receivingAddress.includes('support')) {
      category = 'Product Inquiry'
    }

    const now = new Date().toISOString()

    if (ticketId) {
      // Append to existing ticket
      const { data: message } = await supabase
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
          created_at: now,
        })
        .select()
        .single()

      if (message) {
        await saveAttachments(supabase, message.id, fullEmail?.attachments || [], emailId)
      }

      await supabase
        .from('support_tickets')
        .update({
          last_message_at: now,
          updated_at: now,
          status: 'In Progress',
        })
        .eq('id', ticketId)

      console.log('[webhooks/resend/inbound] Appended to ticket:', ticketId)
    } else {
      // Create new ticket
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          customer_email: fromEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          subject: subject.replace(/^Re:\s*/i, '').trim(),
          category,
          priority: 'Normal',
          status: 'Open',
          source: 'email',
          resend_email_id: emailId,
          message_id: emailMessageId,
          in_reply_to: inReplyTo || null,
          last_message_at: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (!ticket) {
        console.error('[webhooks/resend/inbound] Failed to create ticket')
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
      }

      ticketId = ticket.id

      const { data: message } = await supabase
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
          created_at: now,
        })
        .select()
        .single()

      if (message) {
        await saveAttachments(supabase, message.id, fullEmail?.attachments || [], emailId)
      }

      // Send auto-acknowledgment
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
  attachments: Array<{ filename: string; content_type: string; size: number }>,
  emailId: string
) {
  if (!attachments || attachments.length === 0) return

  for (const att of attachments) {
    await supabase.from('support_ticket_attachments').insert({
      message_id: messageId,
      filename: att.filename,
      content_type: att.content_type,
      size: att.size,
      storage_path: `resend-ref:${emailId}:${att.filename}`,
      url: null,
    })
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
    const fromEmail = businessSettings?.resendSenderEmail || 'updates@flux3d.in'
    const fromName = businessSettings?.resendSenderName || 'Flux3D'

    const subject = `We received your request — ${ticketNumber}`
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6d28d9;">Hi ${customerName || 'there'},</h2>
        <p>We have received your support request and created ticket <strong>${ticketNumber}</strong>.</p>
        <p><strong>Subject:</strong> ${originalSubject}</p>
        <p>Our team will review your request and get back to you shortly.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">Regards,<br />${fromName} Support</p>
      </div>
    `

    const resend = await getResendClient()
    const sendResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: customerEmail,
      subject,
      html,
      replyTo: 'complaints@flux3d.in',
    })

    if (sendResult?.error) {
      console.error(
        '[webhooks/resend/inbound] Resend error sending acknowledgment:',
        sendResult.error.message,
        '| from:', fromEmail,
        '| to:', customerEmail
      )
    } else {
      console.log('[webhooks/resend/inbound] Acknowledgment sent to:', customerEmail, 'ticket:', ticketNumber, 'id:', sendResult?.data?.id)
    }
  } catch (err) {
    console.warn('[webhooks/resend/inbound] Failed to send acknowledgment:', err)
  }
}
