-- WhatsApp webhook event tracking for idempotency, audit, and retry queue.
-- This must exist BEFORE whatsapp_rag_answer_audits which references it.

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload_hash TEXT NOT NULL UNIQUE,
  sender TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_verified BOOLEAN NOT NULL DEFAULT true,
  processed_at TIMESTAMPTZ,
  reply_sent BOOLEAN NOT NULL DEFAULT false,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  last_retried_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created by an earlier migration
ALTER TABLE public.whatsapp_webhook_events
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_retried_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_payload_hash
  ON public.whatsapp_webhook_events(payload_hash);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_processed_at
  ON public.whatsapp_webhook_events(processed_at NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_sender_created_at
  ON public.whatsapp_webhook_events(sender, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_retry
  ON public.whatsapp_webhook_events(retry_count, created_at DESC)
  WHERE processed_at IS NULL;

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_webhook_events_service_role_full_access" ON public.whatsapp_webhook_events;
CREATE POLICY "whatsapp_webhook_events_service_role_full_access" ON public.whatsapp_webhook_events
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON TABLE public.whatsapp_webhook_events FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_webhook_events TO service_role;
