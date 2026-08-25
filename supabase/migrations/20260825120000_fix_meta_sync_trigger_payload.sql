-- ============================================================================
-- Fix: Meta catalog-sync triggers send an EMPTY body to /api/meta/catalog-sync
--
-- Root cause:
--   sync_products_to_meta() / sync_skus_to_meta() POST body => '{}'::jsonb.
--   The webhook handler (src/app/api/meta/catalog-sync/route.ts) expects a
--   Supabase-style payload with `type`, `table`, `record` and `old_record`.
--   With an empty body every real-time product/SKU change was skipped with
--   {"success":true,"skipped":true,"reason":"Unwatched table: undefined"} —
--   so products never reached the WhatsApp / Meta Commerce catalog.
--
-- Also reverts a regression introduced by 20260823000002, which re-created
-- sync_products_to_meta() using the non-existent supabase_functions.http_request
-- (legacy Database Webhooks helper) instead of pg_net's net.http_post.
--
-- Fix:
--   1. Keep pg_net (the supported async HTTP extension) enabled.
--   2. Build a proper Supabase webhook payload from TG_OP / NEW / OLD.
--   3. Harden the triggers: any enqueue exception is logged and swallowed so
--      catalog sync degradation can never block orders or stock updates.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.sync_products_to_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_body JSONB;
BEGIN
  v_secret := public.get_app_secret('supabase_webhook_secret');
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'app_secrets.supabase_webhook_secret is not configured; skipping meta sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_body := jsonb_build_object(
    'type', TG_OP,
    'table', 'shelf_products',
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );

  BEGIN
    PERFORM net.http_post(
      url => 'https://flux3d.in/api/meta/catalog-sync',
      headers => jsonb_build_object(
        'Content-type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body => v_body,
      timeout_milliseconds => 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'meta product sync enqueue failed: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_skus_to_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_body JSONB;
BEGIN
  v_secret := public.get_app_secret('supabase_webhook_secret');
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'app_secrets.supabase_webhook_secret is not configured; skipping meta sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_body := jsonb_build_object(
    'type', TG_OP,
    'table', 'shelf_skus',
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );

  BEGIN
    PERFORM net.http_post(
      url => 'https://flux3d.in/api/meta/catalog-sync',
      headers => jsonb_build_object(
        'Content-type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body => v_body,
      timeout_milliseconds => 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'meta sku sync enqueue failed: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers themselves already exist; re-create defensively for standalone runs.
DROP TRIGGER IF EXISTS shelf_products_meta ON public.shelf_products;
CREATE TRIGGER shelf_products_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_products_to_meta();

DROP TRIGGER IF EXISTS shelf_skus_meta ON public.shelf_skus;
CREATE TRIGGER shelf_skus_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_skus
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_skus_to_meta();