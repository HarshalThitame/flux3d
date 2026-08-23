-- ============================================================================
-- Migration: Guest Checkout Foundation
-- Date: 2026-08-23
-- Purpose:
--   * shelf_orders: nullable user_id + guest identity / claim / tracking columns
--   * payment_attempts: nullable customer_id (guest payment attempts)
--   * account_linking_merge_to_user: handle NULL user_id rows (guest + WhatsApp)
--   * purge_old_records: anonymize unclaimed guest order PII after retention
--
-- Security notes:
--   * No new anon/authenticated RLS policies. Guest order writes happen ONLY
--     through service-role (admin client) server-side code paths; guest reads
--     go through token-verified server routes. Existing owner policies
--     (auth.uid() = user_id) naturally exclude guest rows (user_id IS NULL)
--     until the order is claimed by an authenticated user.
--   * DPDP encryption stance (agreed): Supabase at-rest disk encryption is the
--     accepted baseline for guest PII (guest_contact JSONB); exposure is
--     bounded by 90-day anonymization below. Revisit pgsodium column-level
--     encryption only if a security review requires it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. shelf_orders — guest checkout support
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS guest_session_id UUID,
  ADD COLUMN IF NOT EXISTS claim_candidate_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_access_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS guest_contact JSONB,
  ADD COLUMN IF NOT EXISTS guest_data_anonymized_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shelf_orders.guest_session_id IS
  'Client-generated UUID identifying an anonymous (pre-login) checkout session. Null for logged-in orders.';

COMMENT ON COLUMN public.shelf_orders.claim_candidate_user_id IS
  'Set when the guest email silently matches an existing auth.users row. The order is attached to this user only after they authenticate (prove inbox ownership). Never exposed via API responses.';

COMMENT ON COLUMN public.shelf_orders.guest_access_token_hash IS
  'SHA-256 hash of the guest tracking access token. The raw token only ever travels in the tracking URL / email link and to the checkout client once.';

COMMENT ON COLUMN public.shelf_orders.guest_contact IS
  'Guest contact snapshot { email, phone, name } collected pre-account, used for receipts/tracking until claimed. Anonymized after retention window.';

CREATE INDEX IF NOT EXISTS idx_shelf_orders_guest_session_id
  ON public.shelf_orders(guest_session_id)
  WHERE guest_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shelf_orders_claim_candidate_user_id
  ON public.shelf_orders(claim_candidate_user_id)
  WHERE claim_candidate_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. payment_attempts — guests have no auth.users row
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_attempts
  ALTER COLUMN customer_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Merge RPC must also attach rows whose user_id is currently NULL
--    (`user_id <> target` evaluates NULL on guest rows and skips them).
--    Same change benefits WhatsApp->web linking of synthetic/guest orders.
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
    AND (user_id IS DISTINCT FROM p_target_user_id);

  GET DIAGNOSTICS v_attributed = ROW_COUNT;
  RETURN QUERY SELECT v_attributed;
END;
$$;

REVOKE ALL ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) TO service_role, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Retention / anonymization (DPDP): unclaimed guest orders older than the
--    retention window keep their financial record but lose personal data.
--    Payment attempt metadata snapshots (customer contact, pricing snapshot
--    containing the address) are stripped alongside.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_records(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
  deleted BIGINT;
BEGIN
  DELETE FROM public.error_logs WHERE occurred_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'error_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.page_visits WHERE visited_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'page_visits'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.search_logs WHERE searched_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'search_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.feature_usage WHERE used_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'feature_usage'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.user_sessions WHERE started_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'user_sessions'; deleted_count := deleted; RETURN NEXT;

  -- Account linking: purge expired, unconfirmed link requests
  DELETE FROM public.link_requests
  WHERE confirmed_at IS NULL
    AND expires_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'link_requests'; deleted_count := deleted; RETURN NEXT;

  -- Account linking: purge withdrawn or old consent logs (keep last 90 days by default)
  DELETE FROM public.consent_log
  WHERE withdrawn_at IS NOT NULL
    AND withdrawn_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'consent_log'; deleted_count := deleted; RETURN NEXT;

  -- Also purge non-withdrawn consent logs older than retention period
  DELETE FROM public.consent_log
  WHERE granted = FALSE
    AND timestamp < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'consent_log_denied'; deleted_count := deleted; RETURN NEXT;

  -- Guest checkout: anonymize PII on unclaimed guest orders past retention.
  -- Financial/tax fields are preserved; personal data is replaced with markers.
  UPDATE public.shelf_orders
  SET shipping_address = jsonb_build_object(
        'name', '[anonymized]',
        'phone', '[anonymized]',
        'line1', '[anonymized]',
        'line2', NULL,
        'city', '[anonymized]',
        'state', '[anonymized]',
        'pincode', '[anonymized]'
      ),
      guest_contact = NULL,
      guest_access_token_hash = NULL,
      guest_session_id = NULL,
      guest_data_anonymized_at = NOW()
  WHERE user_id IS NULL
    AND guest_data_anonymized_at IS NULL
    AND placed_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'shelf_orders_guest_anonymized'; deleted_count := deleted; RETURN NEXT;

  -- Guest checkout: strip customer snapshot metadata from orphaned attempts
  UPDATE public.payment_attempts
  SET metadata = metadata - ARRAY['customer', 'snapshot']
  WHERE customer_id IS NULL
    AND created_at < cutoff
    AND (metadata ? ARRAY['customer', 'snapshot']);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'payment_attempts_guest_metadata'; deleted_count := deleted; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_old_records(INTEGER) TO service_role;
