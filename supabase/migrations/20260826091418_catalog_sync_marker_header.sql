-- Defense-in-depth for the Supabase -> catalog-sync webhook: the trigger now
-- sends a marker header alongside the Bearer secret. The endpoint rejects
-- requests that carry the secret without the expected header, defeating blind
-- "Bearer spray" reuse if the same secret pattern leaks elsewhere.
-- (The Bearer secret itself is rotated separately.)

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
        'Authorization', 'Bearer ' || v_secret,
        'X-Meta-Catalog-Sync', 'v1'
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
        'Authorization', 'Bearer ' || v_secret,
        'X-Meta-Catalog-Sync', 'v1'
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

-- Triggers themselves are unchanged; re-create defensively for standalone runs.
DROP TRIGGER IF EXISTS shelf_products_meta ON public.shelf_products;
CREATE TRIGGER shelf_products_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_products
  FOR EACH ROW EXECUTE FUNCTION public.sync_products_to_meta();

DROP TRIGGER IF EXISTS shelf_skus_meta ON public.shelf_skus;
CREATE TRIGGER shelf_skus_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_skus
  FOR EACH ROW EXECUTE FUNCTION public.sync_skus_to_meta();
