-- ============================================================================
-- Migration: Support Email Inbound System
-- Date: 2026-08-22
-- Purpose:
--   1. Drop old support_tickets data (not production)
--   2. Recreate support_tickets with enhanced schema (source, threading, etc.)
--   3. Create support_ticket_messages for conversation threading
--   4. Create support_ticket_attachments for file storage
--   5. Add ticket number sequence FLXTKT-XXXXXX
--   6. Update email system defaults from updates.flux3d.in → flux3d.in
-- ============================================================================

-- ============================================================================
-- 1. Preserve any pre-existing support ticket data instead of destroying it.
--    Rename old tables (if present) to a `_deprecated_*` suffix so the fresh
--    tables below can be created without data loss. A follow-up cleanup
--    migration can drop the deprecated tables once data migration is confirmed.
-- ============================================================================
ALTER TABLE IF EXISTS public.support_ticket_attachments RENAME TO support_ticket_attachments_deprecated_20260822;
ALTER TABLE IF EXISTS public.support_ticket_messages RENAME TO support_ticket_messages_deprecated_20260822;
ALTER TABLE IF EXISTS public.support_tickets RENAME TO support_tickets_deprecated_20260822;

-- ============================================================================
-- 2. Ticket number sequence (preserve existing sequence by renaming it)
-- ============================================================================
ALTER SEQUENCE IF EXISTS public.support_ticket_number_seq RENAME TO support_ticket_number_seq_deprecated_20260822;
CREATE SEQUENCE public.support_ticket_number_seq START WITH 1;

-- ============================================================================
-- 3. Create support_tickets (enhanced)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable ticket number: FLXTKT-000001
  ticket_number TEXT NOT NULL UNIQUE DEFAULT (
    'FLXTKT-' || LPAD(nextval('public.support_ticket_number_seq')::TEXT, 6, '0')
  ),

  -- Customer linkage
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,

  -- Ticket metadata
  subject TEXT NOT NULL,
  category TEXT CHECK (category IN ('Print Quality', 'Order Issue', 'Billing', 'Shipping', 'Product Inquiry', 'Other')),
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent', 'High', 'Normal', 'Low')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('email', 'whatsapp', 'manual', 'contact_form')),

  -- Email threading
  resend_email_id TEXT,
  message_id TEXT,
  in_reply_to TEXT,

  -- Timestamps
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON public.support_tickets (ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets (source);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message_at ON public.support_tickets (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email ON public.support_tickets (customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_message_id ON public.support_tickets (message_id);

-- ============================================================================
-- 4. Create support_ticket_messages (conversation thread)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,

  -- Who sent this message
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
  sender_email TEXT,
  sender_name TEXT,

  -- Message content
  body TEXT,
  html_body TEXT,

  -- Email metadata for threading
  resend_email_id TEXT,
  message_id TEXT,
  in_reply_to TEXT,

  -- Internal notes (not sent to customer)
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for support_ticket_messages
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_message_id ON public.support_ticket_messages (message_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_in_reply_to ON public.support_ticket_messages (in_reply_to);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON public.support_ticket_messages (created_at);

-- ============================================================================
-- 5. Create support_ticket_attachments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID NOT NULL REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,

  filename TEXT NOT NULL,
  content_type TEXT,
  size INTEGER,
  storage_path TEXT,
  url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_message_id ON public.support_ticket_attachments (message_id);

-- ============================================================================
-- 6. Update business_settings email defaults: updates.flux3d.in → flux3d.in
-- ============================================================================
UPDATE public.business_settings
SET resend_sender_domain = 'flux3d.in',
    resend_sender_email = 'updates@flux3d.in'
WHERE deleted_at IS NULL;

-- Add complaints_email column
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS complaints_email TEXT DEFAULT 'complaints@flux3d.in';

UPDATE public.business_settings
SET complaints_email = COALESCE(complaints_email, 'complaints@flux3d.in')
WHERE deleted_at IS NULL;

-- ============================================================================
-- 7. RLS on support_tickets
-- ============================================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_service_role_all" ON public.support_tickets;
CREATE POLICY "support_tickets_service_role_all" ON public.support_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS "support_tickets_select_own" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.support_tickets TO authenticated;

-- ============================================================================
-- 8. RLS on support_ticket_messages
-- ============================================================================
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_ticket_messages_service_role_all" ON public.support_ticket_messages;
CREATE POLICY "support_ticket_messages_service_role_all" ON public.support_ticket_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_messages TO service_role;

DROP POLICY IF EXISTS "support_ticket_messages_select_own" ON public.support_ticket_messages;
CREATE POLICY "support_ticket_messages_select_own" ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_messages.ticket_id AND user_id = auth.uid()
  ));

GRANT SELECT ON public.support_ticket_messages TO authenticated;

-- ============================================================================
-- 9. RLS on support_ticket_attachments
-- ============================================================================
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_ticket_attachments_service_role_all" ON public.support_ticket_attachments;
CREATE POLICY "support_ticket_attachments_service_role_all" ON public.support_ticket_attachments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO service_role;

DROP POLICY IF EXISTS "support_ticket_attachments_select_own" ON public.support_ticket_attachments;
CREATE POLICY "support_ticket_attachments_select_own" ON public.support_ticket_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_ticket_messages m
    JOIN public.support_tickets t ON t.id = m.ticket_id
    WHERE m.id = support_ticket_attachments.message_id AND t.user_id = auth.uid()
  ));

GRANT SELECT ON public.support_ticket_attachments TO authenticated;

-- ============================================================================
-- 10. Auto-update updated_at on support_tickets
-- ============================================================================
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 11. Create ticket-attachments storage bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. Comments
-- ============================================================================
COMMENT ON TABLE public.support_tickets IS 'Customer support tickets with email/WhatsApp/manual sources. Ticket number format: FLXTKT-XXXXXX.';
COMMENT ON TABLE public.support_ticket_messages IS 'Threaded conversation messages for support tickets.';
COMMENT ON TABLE public.support_ticket_attachments IS 'File attachments linked to support ticket messages.';
