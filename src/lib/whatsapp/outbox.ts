import { getQStashClient } from '@/lib/email/qstash'

/**
 * WhatsApp template-message outbox.
 *
 * Enterprise delivery guarantees for HSM template notifications:
 *  1. DEDUPE — unique `idempotency_key` prevents duplicate customer messages
 *     when lifecycle events re-fire (admin re-marks shipped, webhook replays…).
 *  2. DURABILITY — sends are enqueued through QStash (3 retries w/ backoff),
 *     so serverless freezes / transient Graph API errors never silently drop a
 *     customer notification.
 *  3. GRACEFUL DEGRADATION — if the outbox table or QStash is unavailable,
 *     callers receive `fallback` and perform a direct inline send instead, so
 *     message delivery never depends on the outbox being healthy.
 */

export type OutboxJob = {
  /** Unique per logical notification, e.g. `order_shipped:ORD-123`. */
  idempotencyKey: string
  templateName: string
  /** Customer phone, normalized to digits-with-country-code. */
  phone: string
  components: unknown[]
  logText: string
  triggerEvent: string
  userId?: string | null
}

export type EnqueueOutcome =
  | { outcome: 'duplicate' }
  | { outcome: 'queued' }
  | { outcome: 'fallback'; outboxId?: string }

export type SendOutcome = {
  ok: boolean
  messageId?: string
  error?: string
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '')
}

export async function enqueueTemplateSend(job: OutboxJob): Promise<EnqueueOutcome> {
  let adminClient: ReturnType<typeof import('@/lib/admin/server').createAdminSupabaseClient> | null = null
  try {
    const { createAdminSupabaseClient } = await import('@/lib/admin/server')
    adminClient = createAdminSupabaseClient()
  } catch {
    adminClient = null
  }
  if (!adminClient) return { outcome: 'fallback' }

  let outboxId: string | undefined
  try {
    const { data, error } = await adminClient
      .from('whatsapp_template_outbox')
      .insert({
        idempotency_key: job.idempotencyKey,
        template_name: job.templateName,
        phone: job.phone,
        components: job.components,
        log_text: job.logText,
        trigger_event: job.triggerEvent,
        user_id: job.userId ?? null,
      })
      .select('id')
      .single()

    if (error) {
      const code = (error as { code?: string }).code
      if (code === '23505') return { outcome: 'duplicate' }
      // Table missing / RLS / transient DB issue → degrade to inline sending.
      console.warn('[whatsapp/outbox] insert failed, falling back to inline send:', error.message)
      return { outcome: 'fallback' }
    }
    outboxId = data?.id
  } catch (err) {
    console.warn('[whatsapp/outbox] insert threw, falling back to inline send:', err instanceof Error ? err.message : err)
    return { outcome: 'fallback' }
  }

  const siteUrl = getSiteUrl()
  if (!siteUrl) {
    console.warn('[whatsapp/outbox] NEXT_PUBLIC_SITE_URL not set — inline send fallback')
    return { outcome: 'fallback', outboxId }
  }

  try {
    const qstash = getQStashClient()
    await qstash.publishJSON({
      url: `${siteUrl}/api/whatsapp/notify`,
      body: { outboxId },
      retries: 3,
      delay: 1,
      headers: { 'X-Wa-Template': job.templateName },
    })
    return { outcome: 'queued' }
  } catch (err) {
    console.warn('[whatsapp/outbox] QStash publish failed — inline send fallback:', err instanceof Error ? err.message : err)
    return { outcome: 'fallback', outboxId }
  }
}

export type OutboxRow = {
  id: string
  template_name: string
  phone: string
  components: unknown[]
  log_text: string | null
  trigger_event: string | null
  user_id: string | null
  status: 'queued' | 'sent' | 'failed'
  attempts: number
  meta_message_id: string | null
}

export async function loadOutboxRow(id: string): Promise<OutboxRow | null> {
  const { createAdminSupabaseClient } = await import('@/lib/admin/server')
  const adminClient = createAdminSupabaseClient()
  if (!adminClient) return null
  const { data } = await adminClient
    .from('whatsapp_template_outbox')
    .select('id, template_name, phone, components, log_text, trigger_event, user_id, status, attempts, meta_message_id')
    .eq('id', id)
    .maybeSingle()
  return (data as OutboxRow | null) ?? null
}

/** Close out an outbox row after a send attempt and mirror it into the inbox log. */
export async function completeOutboxSend(
  row: OutboxRow,
  result: SendOutcome
): Promise<void> {
  const { createAdminSupabaseClient } = await import('@/lib/admin/server')
  const adminClient = createAdminSupabaseClient()
  if (!adminClient) return

  const now = new Date().toISOString()
  await adminClient
    .from('whatsapp_template_outbox')
    .update({
      status: result.ok ? 'sent' : 'failed',
      attempts: row.attempts + 1,
      meta_message_id: result.messageId ?? row.meta_message_id ?? null,
      error: result.error ?? null,
      ...(result.ok ? { sent_at: now } : {}),
      updated_at: now,
    })
    .eq('id', row.id)

  // Mirror into whatsapp_messages so the inbox + delivery ticks (webhook
  // statuses keyed on meta_message_id) reflect template traffic.
  try {
    await adminClient.from('whatsapp_messages').insert({
      user_id: row.user_id,
      sender: row.phone,
      direction: 'outgoing',
      message_text: row.log_text ?? `[template:${row.template_name}]`,
      automated: true,
      trigger_event: row.trigger_event ?? 'template_send',
      responded: true,
      media_type: 'template',
      meta_message_id: result.messageId ?? null,
      status: result.ok ? 'sent' : 'failed',
      status_error: result.error ? result.error.slice(0, 300) : null,
    })
  } catch (err) {
    console.warn('[whatsapp/outbox] inbox mirror insert failed:', err instanceof Error ? err.message : err)
  }
}
