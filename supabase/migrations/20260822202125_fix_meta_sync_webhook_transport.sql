-- Fix: order creation failing with
--   "function supabase_functions.http_request(unknown, unknown, text, unknown, unknown) does not exist"
--
-- The Meta catalog-sync trigger functions (sync_skus_to_meta /
-- sync_products_to_meta) called supabase_functions.http_request — the legacy
-- Database Webhooks helper, which is NOT present in this database. Any
-- INSERT/UPDATE/DELETE on shelf_skus or shelf_products (including the stock
-- updates performed by create_shelf_order_atomic during checkout) fired the
-- trigger and aborted the whole business transaction with a 500.
--
-- Fix strategy:
--   1. Enable pg_net (the supported async HTTP extension) if missing. pg_net
--      enqueues HTTP calls in a background worker, so webhook failures can
--      never roll back application transactions.
--   2. Switch both trigger functions to net.http_post (pg_net's documented
--      API) instead of the platform-internal supabase_functions schema.
--   3. Harden the triggers: an exception while enqueueing (extension
--      disabled, permissions, etc.) is logged and swallowed so catalog sync
--      degradation can never block orders or stock updates again.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.sync_products_to_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  v_secret := public.get_app_secret('supabase_webhook_secret');
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'app_secrets.supabase_webhook_secret is not configured; skipping meta sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    PERFORM net.http_post(
      url => 'https://flux3d.in/api/meta/catalog-sync',
      headers => jsonb_build_object(
        'Content-type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body => '{}'::jsonb,
      timeout_milliseconds => 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Catalog sync is best-effort: never abort the triggering transaction.
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
BEGIN
  v_secret := public.get_app_secret('supabase_webhook_secret');
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'app_secrets.supabase_webhook_secret is not configured; skipping meta sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    PERFORM net.http_post(
      url => 'https://flux3d.in/api/meta/catalog-sync',
      headers => jsonb_build_object(
        'Content-type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body => '{}'::jsonb,
      timeout_milliseconds => 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Catalog sync is best-effort: never abort the triggering transaction.
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
