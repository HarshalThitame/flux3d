-- WhatsApp message history for customer admin views and webhook auditing

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_text TEXT NOT NULL,
  automated BOOLEAN NOT NULL DEFAULT false,
  trigger_event TEXT,
  responded BOOLEAN NOT NULL DEFAULT false,
  response_time_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_created_at
  ON public.whatsapp_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at
  ON public.whatsapp_messages(created_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_select_own" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_select_own" ON public.whatsapp_messages
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_messages_service_role_full_access" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_service_role_full_access" ON public.whatsapp_messages
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
