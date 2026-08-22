-- Meta catalog sync on shelf_skus changes
-- Mirrors the shelf_products_meta trigger: any INSERT/UPDATE/DELETE on shelf_skus
-- POSTs to /api/meta/catalog-sync so SKU-level changes (price, stock, availability,
-- variant data, deletion) reflect in the Meta catalog immediately.
--
-- SECURITY: The webhook secret is NEVER hardcoded. It is read at fire time
-- from the `app_secrets` table via the `get_app_secret()` SECURITY DEFINER
-- helper. Rotate it by updating `app_secrets`:
--
--   UPDATE public.app_secrets
--   SET value = '<new-secret>', updated_at = NOW()
--   WHERE key = 'supabase_webhook_secret';
--
-- Prerequisite: the `app_secrets` table and `get_app_secret()` helper must
-- exist. They are created in `20260823000002_user_data_export_and_deletion.sql`
-- (supabase_webhook_secret seeded) — if applying standalone, run the helper
-- DDL first.

-- Wrapper trigger function: builds the Authorization header dynamically.
CREATE OR REPLACE FUNCTION public.sync_skus_to_meta()
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

DROP TRIGGER IF EXISTS shelf_skus_meta ON public.shelf_skus;
CREATE TRIGGER shelf_skus_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_skus
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_skus_to_meta();