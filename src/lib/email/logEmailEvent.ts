import { createAdminClient } from '@/lib/supabase/admin'

export async function logEmailEvent(
  emailLogId: string,
  eventType: 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed' | 'complained' | 'clicked' | 'delivery_delayed',
  providerEventId?: string | null,
  rawPayload?: Record<string, unknown>,
) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('email_events').insert({
    email_log_id: emailLogId,
    event_type: eventType,
    provider: 'resend',
    provider_event_id: providerEventId ?? null,
    raw_payload: rawPayload ?? {},
  })
  if (error) {
    console.error('[email-events] Failed to log event:', error.message)
  }
}
