import { createAdminSupabaseClient } from '@/lib/admin/server'

export type QuoteEventType =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'version_bumped'

export type QuoteActorRole = 'customer' | 'admin' | 'system'

export interface LogQuoteEventParams {
  quoteVersionId: string
  orderId?: string | null
  actorId?: string | null
  actorRole: QuoteActorRole
  eventType: QuoteEventType
  previousStatus?: string | null
  newStatus: string
  note?: string
}

/**
 * Logs an immutable event to the quote_version_events table.
 *
 * Designed to be non-fatal: if the insert fails (e.g., DB unavailable),
 * only a console error is emitted. The business operation that triggered
 * this call is never rolled back due to audit log failures.
 *
 * The underlying table enforces immutability at the DB level via
 * Postgres RULE statements — rows can never be updated or deleted.
 */
export async function logQuoteEvent(params: LogQuoteEventParams): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('quote_version_events').insert({
    quote_version_id: params.quoteVersionId,
    order_id: params.orderId ?? null,
    actor_id: params.actorId ?? null,
    actor_role: params.actorRole,
    event_type: params.eventType,
    previous_status: params.previousStatus ?? null,
    new_status: params.newStatus,
    note: params.note ?? null,
  })

  if (error) {
    // Non-fatal: business operation already succeeded; do not throw
    console.error('[quote-audit] Failed to insert quote_version_event:', error.message)
  }
}
