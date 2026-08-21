-- ============================================================================
-- Migration: Support System Enterprise Hardening
-- Date: 2026-08-23
-- Purpose:
--   1. Add direction (inbound/outbound) to support_ticket_messages
--   2. Add idempotency unique index on resend_email_id
--   3. Add order_id linkage to support_tickets
--   4. Create support_ticket_events audit trail
--   5. Backfill direction on existing messages
-- ============================================================================

-- ============================================================================
-- 1. Add direction column
-- ============================================================================
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS direction TEXT
  CHECK (direction IN ('inbound', 'outbound'));

-- ============================================================================
-- 2. Backfill direction from sender_type
-- ============================================================================
UPDATE public.support_ticket_messages
SET direction = CASE sender_type
  WHEN 'customer' THEN 'inbound'
  WHEN 'admin' THEN 'outbound'
  WHEN 'system' THEN 'outbound'
  ELSE 'inbound'
END
WHERE direction IS NULL;

-- ============================================================================
-- 3. Make direction NOT NULL after backfill
-- ============================================================================
ALTER TABLE public.support_ticket_messages
  ALTER COLUMN direction SET NOT NULL;

-- ============================================================================
-- 4. Idempotency: unique index on resend_email_id (partial, where not null)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_ticket_messages_resend_email_id_unique
  ON public.support_ticket_messages(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

-- ============================================================================
-- 5. Add order_id linkage to support_tickets
-- ============================================================================
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON public.support_tickets(order_id);

-- ============================================================================
-- 6. Create support_ticket_events audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  ticket_id UUID NOT NULL
    REFERENCES public.support_tickets(id)
    ON DELETE CASCADE,

  event_type TEXT NOT NULL,
    -- e.g. ticket.created, status.changed, priority.changed, category.changed,
    --      ticket.assigned, admin.replied, customer.replied, ticket.resolved,
    --      ticket.reopened, internal_note.added

  old_value JSONB,
  new_value JSONB,

  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- NULL when triggered by system/webhook

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket_id ON public.support_ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_events_created_at ON public.support_ticket_events(created_at DESC);

-- ============================================================================
-- 7. RLS on support_ticket_events
-- ============================================================================
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_ticket_events_service_role_all" ON public.support_ticket_events;
CREATE POLICY "support_ticket_events_service_role_all" ON public.support_ticket_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_events TO service_role;

DROP POLICY IF EXISTS "support_ticket_events_select_own" ON public.support_ticket_events;
CREATE POLICY "support_ticket_events_select_own" ON public.support_ticket_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_events.ticket_id AND user_id = auth.uid()
  ));

GRANT SELECT ON public.support_ticket_events TO authenticated;

-- ============================================================================
-- 8. Function to auto-log ticket events on UPDATE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_ticket_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.support_ticket_events (ticket_id, event_type, old_value, new_value, metadata)
    VALUES (NEW.id, 'status.changed', jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status), '{}');
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.support_ticket_events (ticket_id, event_type, old_value, new_value, metadata)
    VALUES (NEW.id, 'priority.changed', jsonb_build_object('priority', OLD.priority), jsonb_build_object('priority', NEW.priority), '{}');
  END IF;

  IF OLD.category IS DISTINCT FROM NEW.category THEN
    INSERT INTO public.support_ticket_events (ticket_id, event_type, old_value, new_value, metadata)
    VALUES (NEW.id, 'category.changed', jsonb_build_object('category', OLD.category), jsonb_build_object('category', NEW.category), '{}');
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.support_ticket_events (ticket_id, event_type, old_value, new_value, metadata)
    VALUES (NEW.id, 'ticket.assigned', jsonb_build_object('assigned_to', OLD.assigned_to), jsonb_build_object('assigned_to', NEW.assigned_to), '{}');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_support_tickets_event_log ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_event_log
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_event();

-- ============================================================================
-- 9. RPC: Average first response time (in minutes)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.support_avg_first_response_time()
RETURNS NUMERIC AS $$
DECLARE
  avg_minutes NUMERIC;
BEGIN
  SELECT AVG(EXTRACT(EPOCH FROM (first_admin_reply.created_at - ticket.created_at)) / 60)
  INTO avg_minutes
  FROM public.support_tickets ticket
  INNER JOIN LATERAL (
    SELECT created_at
    FROM public.support_ticket_messages
    WHERE ticket_id = ticket.id
      AND sender_type = 'admin'
      AND is_internal = false
    ORDER BY created_at ASC
    LIMIT 1
  ) first_admin_reply ON true;

  RETURN avg_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. Comments
-- ============================================================================
COMMENT ON TABLE public.support_ticket_events IS 'Audit trail of all changes to support tickets (status, priority, category, assignment).';
COMMENT ON COLUMN public.support_ticket_messages.direction IS 'inbound = from customer, outbound = from admin/system.';
COMMENT ON COLUMN public.support_tickets.order_id IS 'Optional link to an existing order for context.';
