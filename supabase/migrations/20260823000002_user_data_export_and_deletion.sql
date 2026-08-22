-- ============================================================================
-- Migration: User data export + account deletion (DPDP Act 2023)
-- Date: 2026-08-22
-- Purpose:
--   1. Anonymize shelf_orders PII during account deletion (was not covered)
--   2. Track account deletion requests with email-confirmation tokens
-- ============================================================================

-- ============================================================================
-- 1. Enhance delete_user_data to also anonymize shelf_orders
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted BIGINT;
BEGIN
  DELETE FROM public.error_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'error_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.page_visits WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'page_visits'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.feature_usage WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'feature_usage'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.search_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'search_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'user_sessions'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.addresses WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'addresses'; deleted_count := deleted; RETURN NEXT;

  -- Anonymize custom orders (keep for legal/tax compliance, remove PII)
  UPDATE public.orders SET
    full_name = '[deleted]',
    phone = '[deleted]',
    address_line1 = '[deleted]',
    address_line2 = NULL,
    landmark = NULL,
    email = NULL,
    notes = NULL
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'orders_anonymized'; deleted_count := deleted; RETURN NEXT;

  -- Anonymize shelf (3D shop) orders — contains PII in shipping_address JSONB
  UPDATE public.shelf_orders SET
    shipping_address = jsonb_build_object(
      'name', '[deleted]',
      'phone', '[deleted]',
      'line1', '[deleted]',
      'line2', NULL,
      'city', '[deleted]',
      'state', '[deleted]',
      'pincode', '[deleted]'
    )
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'shelf_orders_anonymized'; deleted_count := deleted; RETURN NEXT;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'profiles'; deleted_count := deleted; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO service_role;

-- ============================================================================
-- 2. Account deletion request tracking (email-confirmation flow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user
  ON public.account_deletion_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_token
  ON public.account_deletion_requests(token_hash);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_deletion_requests_service_role_all" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_service_role_all" ON public.account_deletion_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "account_deletion_requests_select_own" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_select_own" ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. Runtime-configurable app secrets (no hardcoded secrets in migrations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Revoke the default PUBLIC/anon/authenticated grants on the secrets table —
-- only the service role (and the SECURITY DEFINER helper) may access it.
REVOKE ALL ON public.app_secrets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_secrets TO service_role;

DROP POLICY IF EXISTS "app_secrets_service_role_all" ON public.app_secrets;
CREATE POLICY "app_secrets_service_role_all" ON public.app_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SECURITY DEFINER helper: only this function reads app_secrets (service_role
-- and functions may call it); anon/authenticated cannot read secrets directly.
CREATE OR REPLACE FUNCTION public.get_app_secret(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_secrets WHERE key = p_key LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_app_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_secret(TEXT) TO service_role;

-- Wrapper trigger functions for Meta catalog sync (never hardcode the secret).
CREATE OR REPLACE FUNCTION public.sync_products_to_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  v_secret := public.get_app_secret('supabase_webhook_secret');
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'app_secrets.supabase_webhook_secret is not configured; skipping meta sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM supabase_functions.http_request(
    'https://flux3d.in/api/meta/catalog-sync',
    'POST',
    '{"Content-type":"application/json","Authorization":"Bearer ' || v_secret || '"}',
    '{}',
    '5000'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS shelf_products_meta ON public.shelf_products;
CREATE TRIGGER shelf_products_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_products_to_meta();