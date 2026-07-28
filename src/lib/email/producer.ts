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
    subject: payload.subject ?? undefined,
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
    // QStash not configured — fall back to direct dispatch in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] QStash unavailable; falling back to direct dispatch in development')
      const { dispatchEmail } = await import('./dispatcher')
      await dispatchEmail(payload, logId)
      return { logId }
    }

    // In production, mark as failed and surface the error
    await supabase
      .from('email_logs')
      .update({ status: 'failed', error_message: `QStash enqueue failed: ${err instanceof Error ? err.message : 'unknown'}` })
      .eq('id', logId)

    throw err
  }
}
