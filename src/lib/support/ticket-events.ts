// ============================================================================
// Ticket Event Logger
// ============================================================================
// Utility to insert rows into support_ticket_events from the application layer.
// Used for events not captured by the DB trigger (e.g. admin.replied,
// customer.replied, internal_note.added).
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'

export type TicketEventType =
  | 'ticket.created'
  | 'status.changed'
  | 'priority.changed'
  | 'category.changed'
  | 'ticket.assigned'
  | 'admin.replied'
  | 'customer.replied'
  | 'ticket.resolved'
  | 'ticket.reopened'
  | 'internal_note.added'

export async function logTicketEvent(
  ticketId: string,
  eventType: TicketEventType,
  options: {
    oldValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    performedBy?: string | null
    metadata?: Record<string, unknown>
  } = {}
) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('support_ticket_events').insert({
    ticket_id: ticketId,
    event_type: eventType,
    old_value: options.oldValue ?? null,
    new_value: options.newValue ?? null,
    performed_by: options.performedBy ?? null,
    metadata: options.metadata ?? {},
  })

  if (error) {
    console.error('[ticket-events] Failed to log event:', error.message, { ticketId, eventType })
  }
}
