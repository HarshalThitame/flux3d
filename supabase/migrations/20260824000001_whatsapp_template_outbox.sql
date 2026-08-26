-- WhatsApp template outbox — durable, deduped delivery for HSM notifications.
--
-- Lifecycle:
--   1. notify*() inserts a row (idempotency_key UNIQUE = dedupe gate) and
--      enqueues {outboxId} to QStash → /api/whatsapp/notify
--   2. Consumer sends via Cloud API, then marks sent/failed and mirrors the
--      message into whatsapp_messages (meta_message_id links delivery ticks).
--   3. If outbox/QStash is unavailable the caller degrades to inline sending,
--      so customer messaging never depends on this table being healthy.

CREATE TABLE IF NOT EXISTS public.whatsapp_template_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  log_text TEXT,
  trigger_event TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  meta_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_template_outbox_status
  ON public.whatsapp_template_outbox(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_template_outbox_created
  ON public.whatsapp_template_outbox(created_at);

ALTER TABLE public.whatsapp_template_outbox ENABLE ROW LEVEL SECURITY;
