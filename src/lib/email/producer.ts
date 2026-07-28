import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueEmail as qstashEnqueue } from './qstash'
import type { EmailJobPayload } from './types'
import type { EmailLogRow } from '../../../types/database'

/**
 * Email producer.
 *
 * Responsibilities:
 *   1. Insert email_logs row with status='queued'
 *   2. Publish the job to QStash
 *   3. Update log with QStash message ID if available
 *
 * If QStash is not configured (e.g., local dev without QSTASH_TOKEN),
 * we fall back to synchronous dispatch so developers still receive emails.
 *
 * @returns The email log ID and queue message ID
 */
export async function enqueueEmail(
  payload: EmailJobPayload
): Promise<{ logId: string; messageId?: string }> {
  const supabase = createAdminClient()

  // Step 1: Insert audit log
  const logInsert: Partial<EmailLogRow> = {
    user_id: payload.userId ?? null,
    recipient: payload.recipient,
    email_type: payload.emailType,
    subject: payload.subject ?? buildSubject(payload),
    template_name: payload.emailType,
    status: 'queued',
    queued_at: new Date().toISOString(),
  }

  const { data: log, error: insertError } = await supabase
    .from('email_logs')
    .insert(logInsert)
    .select()
    .single()

  if (insertError || !log) {
    console.error('[email] Failed to create email log:', insertError)
    throw new Error(`Failed to queue email: ${insertError?.message ?? 'unknown'}`)
  }

  const logId = (log as EmailLogRow).id

  // Step 2: Publish to QStash
  try {
    const result = await qstashEnqueue({ ...payload, logId })
    return { logId, messageId: result.messageId }
  } catch (err) {
    // QStash failed — fall back to direct dispatch immediately.
    // This ensures emails are never lost, even if the queue is unavailable.
    console.warn('[email] QStash enqueue failed; falling back to direct dispatch:', err instanceof Error ? err.message : err)
    const { dispatchEmail } = await import('./dispatcher')
    await dispatchEmail(payload, logId)
    return { logId }
  }
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
