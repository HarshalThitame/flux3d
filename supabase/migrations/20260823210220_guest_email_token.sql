-- ============================================================================
-- Migration: Separate email-link token for guest orders
-- Date: 2026-08-23
-- Purpose:
--   Receipt emails rotate their tracking token (so old emailed links can be
--   invalidated). Rotating the CHECKOUT token raced with the in-flight
--   payment verification and locked guests out ("not allowed to verify").
--
--   Now: guest_access_token_hash      = stable checkout/payment token
--        guest_email_token_hash       = rotated per receipt/tracking email
--   Order-tracking surfaces accept either; payment APIs accept only the
--   checkout token.
-- ============================================================================

ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS guest_email_token_hash TEXT;

COMMENT ON COLUMN public.shelf_orders.guest_email_token_hash IS
  'SHA-256 hash of the email-link tracking token, rotated each time a receipt/resend email is sent. Tracking pages accept this OR the checkout token; payment APIs accept only the checkout token.';

-- ---------------------------------------------------------------------------
-- Keep the anonymization purge in sync: clear BOTH guest token hashes.
-- (CREATE OR REPLACE — safe to re-run.)
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

  DELETE FROM public.link_requests
  WHERE confirmed_at IS NULL
    AND expires_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'link_requests'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.consent_log
  WHERE withdrawn_at IS NOT NULL
    AND withdrawn_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'consent_log'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.consent_log
  WHERE granted = FALSE
    AND timestamp < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'consent_log_denied'; deleted_count := deleted; RETURN NEXT;

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
      guest_email_token_hash = NULL,
      guest_session_id = NULL,
      guest_data_anonymized_at = NOW()
  WHERE user_id IS NULL
    AND guest_data_anonymized_at IS NULL
    AND placed_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'shelf_orders_guest_anonymized'; deleted_count := deleted; RETURN NEXT;

  UPDATE public.payment_attempts
  SET metadata = metadata - ARRAY['customer', 'snapshot']
  WHERE customer_id IS NULL
    AND created_at < cutoff
    AND (metadata ? ARRAY['customer', 'snapshot']);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'payment_attempts_guest_metadata'; deleted_count := deleted; RETURN NEXT;
END;
$$;
