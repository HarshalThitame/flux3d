-- Conversation memory for WhatsApp AI — stores recent message turns per phone
--
-- Cleanup (run daily via Supabase SQL editor or cron):
--   DELETE FROM public.whatsapp_sessions
--   WHERE last_active < NOW() - INTERVAL '24 hours';

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  phone_number TEXT PRIMARY KEY,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_sessions_service_role_full_access" ON public.whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_service_role_full_access" ON public.whatsapp_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
