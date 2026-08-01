-- WhatsApp order session state machine for the in-chat ordering flow.
-- Tracks the multi-step guided ordering conversation per phone number.

CREATE TABLE IF NOT EXISTS public.whatsapp_order_sessions (
  phone_number TEXT PRIMARY KEY,
  step TEXT NOT NULL DEFAULT 'idle',
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_order_sessions_expires_at
  ON public.whatsapp_order_sessions(expires_at);

ALTER TABLE public.whatsapp_order_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_order_sessions_service_role_full_access" ON public.whatsapp_order_sessions;
CREATE POLICY "whatsapp_order_sessions_service_role_full_access" ON public.whatsapp_order_sessions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "whatsapp_order_sessions_select_own" ON public.whatsapp_order_sessions;
CREATE POLICY "whatsapp_order_sessions_select_own" ON public.whatsapp_order_sessions
FOR SELECT TO authenticated
USING (phone_number = regexp_replace(auth.jwt()->>'phone', '^\+\d{2}', '', ''));
-- ^ best-effort self-lookup; service_role remains the primary access path.

-- TTL cleanup: purge sessions older than p_max_age_minutes.
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_order_sessions(p_max_age_minutes INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.whatsapp_order_sessions
  WHERE expires_at < NOW() - (p_max_age_minutes || ' minutes')::INTERVAL
     OR updated_at < NOW() - ((p_max_age_minutes * 3) || ' minutes')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_whatsapp_order_sessions(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_whatsapp_order_sessions(INTEGER) TO service_role;
