-- ============================================================================
-- Migration: Enterprise Email System
-- Date: 2026-07-28
-- Purpose:
--   1. Replace legacy email_events with production-grade email_logs + email_events
--   2. Add Resend ESP configuration to business_settings
--   3. Add tracking columns to orders (3D print orders)
--   4. Add email bounce flags to profiles
--   5. Set up indexes, RLS, and policies
-- ============================================================================

-- ============================================================================
-- 1. Drop legacy email_events (no production data)
-- ============================================================================
DROP TABLE IF EXISTS public.email_events CASCADE;

-- ============================================================================
-- 2. Create email_logs (master record per dispatched email)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient linkage
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,

  -- Order linkage (supports both custom 3D-print orders and shop orders)
  order_id UUID NULL,
  order_type TEXT NULL CHECK (order_type IN ('custom', 'shop')),

  -- Email metadata
  email_type TEXT NOT NULL CHECK (
    email_type IN (
      'welcome',
      'email_verification',
      'password_reset',
      'order_placed_customer',
      'order_placed_admin',
      'model_validation_pass',
      'model_validation_fail',
      'production_started',
      'order_shipped',
      'delivery_confirmation',
      'payment_receipt',
      'payment_failed',
      'refund_issued',
      'contact_notification'
    )
  ),
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,

  -- Provider metadata
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend')),
  provider_message_id TEXT,
  resend_id TEXT,

  -- Lifecycle status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN (
      'queued',
      'sent',
      'delivered',
      'opened',
      'bounced',
      'failed',
      'complained',
      'dropped'
    )
  ),

  -- Timestamps for each lifecycle stage
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  -- Error context (populated on failure or bounce)
  error_message TEXT,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),

  -- Retry / resend tracking
  retry_count INTEGER NOT NULL DEFAULT 0,
  original_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_logs (performance-critical for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_message_id ON public.email_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at_desc ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status_created_at ON public.email_logs(status, created_at DESC);

-- Partial index: quickly find bounces for bounce-handling queries
CREATE INDEX IF NOT EXISTS idx_email_logs_bounced ON public.email_logs(bounced_at)
  WHERE bounced_at IS NOT NULL;

-- ============================================================================
-- 3. Create email_events (immutable webhook audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link back to master log
  email_log_id UUID NOT NULL REFERENCES public.email_logs(id) ON DELETE CASCADE,

  -- Event metadata
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'sent',
      'delivered',
      'opened',
      'bounced',
      'failed',
      'complained',
      'clicked',
      'delivery_delayed'
    )
  ),
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend')),
  provider_event_id TEXT,

  -- Raw payload for forensics and debugging
  raw_payload JSONB NOT NULL DEFAULT '{}',

  -- Enrichment from webhook
  recipient TEXT,
  ip_address TEXT,
  user_agent TEXT,
  geo_location JSONB,

  -- Provider timestamp (when they observed the event)
  provider_timestamp TIMESTAMPTZ,

  -- Our ingestion timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_events
CREATE INDEX IF NOT EXISTS idx_email_events_email_log_id ON public.email_events(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at);
CREATE INDEX IF NOT EXISTS idx_email_events_provider_event_id ON public.email_events(provider_event_id);

-- ============================================================================
-- 4. Add tracking columns to orders (3D print / custom quote orders)
-- ============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- ============================================================================
-- 5. Add email bounce flags to profiles
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_bounced_at TIMESTAMPTZ;

-- Partial index: quickly find profiles with bounced emails
CREATE INDEX IF NOT EXISTS idx_profiles_email_bounced ON public.profiles(email_bounced)
  WHERE email_bounced = TRUE;

-- ============================================================================
-- 6. Add Resend ESP configuration to business_settings
-- ============================================================================
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
  ADD COLUMN IF NOT EXISTS resend_sender_domain TEXT DEFAULT 'updates.flux3d.in',
  ADD COLUMN IF NOT EXISTS resend_sender_name TEXT,
  ADD COLUMN IF NOT EXISTS resend_sender_email TEXT DEFAULT 'noreply@updates.flux3d.in',
  ADD COLUMN IF NOT EXISTS resend_webhook_secret TEXT;

-- ============================================================================
-- 7. Update existing rows with sensible defaults
-- ============================================================================
UPDATE public.business_settings
SET resend_sender_domain = COALESCE(resend_sender_domain, 'updates.flux3d.in'),
    resend_sender_email = COALESCE(resend_sender_email, 'noreply@updates.flux3d.in')
WHERE deleted_at IS NULL;

-- ============================================================================
-- 8. RLS on email_logs
-- ============================================================================
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all email_logs" ON public.email_logs;
CREATE POLICY "Admins can manage all email_logs" ON public.email_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Users can view their own email logs
DROP POLICY IF EXISTS "Users can view own email_logs" ON public.email_logs;
CREATE POLICY "Users can view own email_logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 9. RLS on email_events
-- ============================================================================
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all email_events" ON public.email_events;
CREATE POLICY "Admins can manage all email_events" ON public.email_events
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Users can view events for their own logs
DROP POLICY IF EXISTS "Users can view own email_events" ON public.email_events;
CREATE POLICY "Users can view own email_events" ON public.email_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.email_logs
    WHERE id = email_events.email_log_id AND user_id = auth.uid()
  ));

-- ============================================================================
-- 10. Grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_events TO authenticated;

-- ============================================================================
-- 11. Auto-update updated_at on email_logs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_logs_updated_at ON public.email_logs;
CREATE TRIGGER trg_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 12. Comments for documentation
-- ============================================================================
COMMENT ON TABLE public.email_logs IS 'Master record for every transactional email dispatched through Resend. One row per email attempt.';
COMMENT ON TABLE public.email_events IS 'Immutable audit trail of Resend webhook events. One row per webhook callback.';
COMMENT ON COLUMN public.email_logs.original_log_id IS 'If this email is a resend, references the original email_logs row.';
COMMENT ON COLUMN public.email_logs.retry_count IS 'Number of retry attempts made by the queue system before final failure or success.';
COMMENT ON COLUMN public.email_events.raw_payload IS 'Complete JSON body from the Resend webhook, preserved for debugging and compliance.';
