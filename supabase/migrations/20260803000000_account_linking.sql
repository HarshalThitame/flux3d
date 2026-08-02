-- ============================================================================
-- Migration: WhatsApp <-> Website Account Linking (Phase 0 - Foundation)
-- Date: 2026-08-03
-- Purpose:
--   * profiles: phone_verified, whatsapp_opt_in (+ audit timestamp), phone_canonical
--   * link_requests: single-use magic-link / OTP tokens
--   * consent_log: DPDP consent evidence
--   * email_logs.email_type: add 'account_link_confirmation'
--   * account_linking_merge_to_user(target_user_id, phone): atomic order reassignment
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. profiles extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_canonical TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_canonical
  ON public.profiles(phone_canonical)
  WHERE phone_canonical IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. link_requests (single-use tokens)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,                    -- nanoid; the raw token is only ever in the email link
  initiated_from TEXT NOT NULL CHECK (initiated_from IN ('whatsapp','web')),
  method TEXT NOT NULL CHECK (method IN ('email_magic_link','whatsapp_otp')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- set once matched to a website account
  target_phone TEXT NOT NULL,                    -- canonical digits-only
  target_email TEXT,                             -- set for the email path
  otp_code_hash TEXT,                            -- Direction B WhatsApp OTP
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_requests_token ON public.link_requests(token);
CREATE INDEX IF NOT EXISTS idx_link_requests_target_phone ON public.link_requests(target_phone);
CREATE INDEX IF NOT EXISTS idx_link_requests_expires_at ON public.link_requests(expires_at);
-- One pending (unconfirmed, unexpired) request per phone — prevents stacking prompts.
CREATE UNIQUE INDEX IF NOT EXISTS uq_link_requests_active_phone
  ON public.link_requests(target_phone)
  WHERE confirmed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. consent_log (DPDP evidence)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  consent_type TEXT NOT NULL
    CHECK (consent_type IN ('whatsapp_messaging','data_processing','marketing','account_linking')),
  granted BOOLEAN NOT NULL,
  method TEXT NOT NULL
    CHECK (method IN ('checkbox_web','whatsapp_reply','button_click')),
  ip_address INET,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_log_phone ON public.consent_log(phone_number);
CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON public.consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_consent_type ON public.consent_log(consent_type);

-- ---------------------------------------------------------------------------
-- 4. email_logs: extend the email_type CHECK to include account_link_confirmation
--    (Robust to the auto-generated constraint name from the inline CHECK in
--     20260728000100_email_system.sql.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.email_logs'::regclass
    AND contype = 'c'
    AND conname LIKE 'email_logs_email_type%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS %I', cname);
  END IF;

  ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check
    CHECK (email_type IN ('welcome','email_verification','password_reset','order_placed_customer',
      'order_placed_admin','model_validation_pass','model_validation_fail','production_started',
      'order_shipped','delivery_confirmation','payment_receipt','payment_failed','refund_issued',
      'contact_notification','account_link_confirmation'));
END $$;

-- ---------------------------------------------------------------------------
-- 5. RLS: link_requests + consent_log are service-role managed
--    (consistent with whatsapp_order_sessions). Authenticated users can only
--    read their own profile, not arbitrary link requests.
-- ---------------------------------------------------------------------------
ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_requests_service_role_full_access" ON public.link_requests;
CREATE POLICY "link_requests_service_role_full_access"
  ON public.link_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "consent_log_service_role_full_access" ON public.consent_log;
CREATE POLICY "consent_log_service_role_full_access"
  ON public.consent_log FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles can view own linkable data" ON public.profiles;
CREATE POLICY "profiles can view own linkable data" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 6. Atomic merge: reassign WhatsApp/shelf orders (by phone) to a real account.
--    Matches on the last 10 digits of the digit-stripped phone so that a
--    12-digit wa_id ("919623023480") matches a 10-digit shipping_address phone.
--    Idempotent: only reassigns rows whose owner differs from the target.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.account_linking_merge_to_user(
  p_target_user_id UUID,
  p_phone TEXT
) RETURNS TABLE(orders_attributed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attributed BIGINT;
BEGIN
  IF p_target_user_id IS NULL OR p_phone IS NULL OR p_phone = '' THEN
    RETURN QUERY SELECT 0::BIGINT;
    RETURN;
  END IF;

  UPDATE public.shelf_orders
  SET user_id = p_target_user_id,
      order_source = COALESCE(order_source, 'whatsapp')
  WHERE shipping_address IS NOT NULL
    AND right(regexp_replace((shipping_address->>'phone')::text, '[^0-9]', '', 'g'), 10)
        = right(regexp_replace(p_phone::text, '[^0-9]', '', 'g'), 10)
    AND user_id <> p_target_user_id;

  GET DIAGNOSTICS v_attributed = ROW_COUNT;
  RETURN QUERY SELECT v_attributed;
END;
$$;

REVOKE ALL ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) TO service_role, authenticated;

-- Extend admin_audit_logs.target_type to include link_request actions.
-- (Matches the AdminAuditTargetType set in types/database.ts + 'link_request'.)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.admin_audit_logs'::regclass
    AND contype = 'c'
    AND conname LIKE 'admin_audit_logs_target_type%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS %I', cname);
  END IF;

  ALTER TABLE public.admin_audit_logs ADD CONSTRAINT admin_audit_logs_target_type_check
    CHECK (target_type IN ('order','user','material','coupon','setting','payment',
      'refund','printer','quote','manufacturing','admin_user','whatsapp_knowledge','link_request'));
END $$;
