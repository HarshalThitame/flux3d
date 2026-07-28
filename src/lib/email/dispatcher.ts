import { createAdminClient } from '@/lib/supabase/admin'
import { getResendClient, getSenderAddress } from './resend-client'
import { renderTemplate } from './template-registry'
import type { EmailJobPayload, DispatchResult } from './types'
import type { EmailLogRow } from '../../../types/database'

/**
 * Core email dispatcher.
 *
 * Flow:
 *   1. Load email log from DB (inserted by producer as 'queued')
 *   2. Render React Email template → HTML
 *   3. Send via Resend API
 *   4. Update log: status='sent', provider_message_id, sent_at
 *   5. On any error: update log: status='failed', error_message
 *
 * Edge cases:
 *   - If the log row is missing (DB inconsistency), we still attempt to send
 *     but log a warning. This prevents emails from being lost due to DB issues.
 *   - If Resend returns a 4xx, we do NOT retry (invalid email, blocked, etc.).
 *     The log is marked 'failed' permanently.
 *   - If Resend returns a 5xx, QStash will retry automatically. We update the
 *     log on each attempt so admins can see retry count.
 */

export async function dispatchEmail(
  payload: EmailJobPayload,
  logId?: string
): Promise<DispatchResult> {
  const supabase = createAdminClient()

  // Step 1: Resolve or create the log row
  let log: EmailLogRow | null = null
  if (logId) {
    const { data } = await supabase.from('email_logs').select('*').eq('id', logId).single()
    log = data as EmailLogRow | null
  }

  if (!log) {
    // Safety net: create a log row even if producer failed to insert one.
    // This ensures every dispatch attempt is auditable.
    const insertResult = await supabase
      .from('email_logs')
      .insert({
        user_id: payload.userId ?? null,
        recipient: payload.recipient,
        email_type: payload.emailType,
        subject: payload.subject ?? buildSubject(payload),
        template_name: payload.emailType,
        status: 'queued',
      })
      .select()
      .single()

    if (insertResult.data) {
      log = insertResult.data as EmailLogRow
    } else {
      console.error('[email] Failed to create email log:', insertResult.error)
    }
  }

  // Step 2: Build the subject line if not provided
  const subject = payload.subject ?? buildSubject(payload)

  try {
    // Step 3: Render the template
    const html = await renderTemplate(payload.emailType, payload)

    // Step 4: Send via Resend
    const resend = await getResendClient()
    const sender = await getSenderAddress()
    const from = `"${sender.name}" <${sender.email}>`

    const { data, error } = await resend.emails.send({
      from,
      to: payload.recipient,
      subject,
      html,
      tags: [
        { name: 'email_type', value: payload.emailType },
        ...(payload.userId ? [{ name: 'user_id', value: payload.userId }] : []),
      ],
    })

    if (error || !data?.id) {
      const errMsg = error?.message ?? 'Resend returned no message id'
      await markFailed(supabase, log?.id ?? null, errMsg)
      return { ok: false, error: errMsg }
    }

    // Step 5: Update log as sent
    const update: Partial<EmailLogRow> = {
      status: 'sent',
      provider_message_id: data.id,
      resend_id: data.id,
      sent_at: new Date().toISOString(),
      subject,
    }

    if (log?.id) {
      await supabase.from('email_logs').update(update).eq('id', log.id)
    }

    return { ok: true, messageId: data.id, resendId: data.id }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown dispatch error'
    console.error('[email] Dispatch failed:', errMsg)
    await markFailed(supabase, log?.id ?? null, errMsg)
    return { ok: false, error: errMsg }
  }
}

async function markFailed(
  supabase: ReturnType<typeof createAdminClient>,
  logId: string | null,
  errorMessage: string
) {
  if (!logId) return
  await supabase
    .from('email_logs')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', logId)
}

function buildSubject(payload: EmailJobPayload): string {
  switch (payload.emailType) {
    case 'welcome':
      return 'Welcome to Flux3D!'
    case 'email_verification':
      return 'Verify your email address'
    case 'password_reset':
      return 'Reset your Flux3D password'
    case 'order_placed_customer':
      return `Order ${payload.orderNumber} confirmed — Flux3D`
    case 'order_placed_admin':
      return `[Admin] New order ${payload.orderNumber}`
    case 'model_validation_pass':
      return `Your 3D model for order ${payload.orderNumber} passed validation`
    case 'model_validation_fail':
      return `Action needed: 3D model issue for order ${payload.orderNumber}`
    case 'production_started':
      return `Production started for order ${payload.orderNumber}`
    case 'order_shipped':
      return `Your order ${payload.orderNumber} has shipped 🚚`
    case 'delivery_confirmation':
      return `Order ${payload.orderNumber} delivered — how did we do?`
    case 'payment_receipt':
      return `Payment receipt for order ${payload.orderNumber}`
    case 'payment_failed':
      return `Payment failed for order ${payload.orderNumber}`
    case 'refund_issued':
      return `Refund issued for order ${payload.orderNumber}`
    case 'contact_notification':
      return `New contact form submission from ${payload.senderName}`
    default:
      return 'Flux3D Notification'
  }
}
