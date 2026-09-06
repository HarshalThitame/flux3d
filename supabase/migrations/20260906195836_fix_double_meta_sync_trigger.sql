-- ============================================================================
-- Defense-in-depth: Skip shelf_products_meta trigger for base_price-only updates
--
-- Even though update_base_price_no_sync() suppresses the trigger at the
-- database level, this migration adds a second guard at the trigger function
-- level: if an UPDATE to shelf_products changes ONLY base_price and/or
-- updated_at (both of which are auto-derived from SKU changes — never a
-- genuine admin product edit), the trigger skips the Meta API call.
--
-- This guards against:
--   • Direct SQL updates to base_price from scripts/migrations
--   • Any future server code that calls UPDATE shelf_products SET base_price = ...
--     without going through update_base_price_no_sync()
--   • Concurrent webhook storms where two product webhooks fire for the same
--     base_price change before the other completes
--
-- NOTE: The trigger already has the META_TRACKING_COLUMNS guard in the
-- webhook handler for meta_item_id / meta_synced_at / meta_sync_error.
-- This migration adds a complementary guard at the Postgres level for
-- base_price-only changes.
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
  v_body   JSONB;
BEGIN
  -- ── Defense: skip if only derived/tracking columns changed ─────────────────
  IF TG_OP = 'UPDATE' THEN
    -- Skip when ONLY base_price and/or updated_at changed.
    -- These are auto-updated by SKU route (base_price sync) or DB triggers
    -- (updated_at) and are never direct admin product edits.
    -- The shelf_skus_meta trigger already fires a sync for the same product.
    IF (
      NEW.name                      IS NOT DISTINCT FROM OLD.name AND
      NEW.slug                      IS NOT DISTINCT FROM OLD.slug AND
      NEW.description               IS NOT DISTINCT FROM OLD.description AND
      NEW.long_description          IS NOT DISTINCT FROM OLD.long_description AND
      NEW.thumbnail_url             IS NOT DISTINCT FROM OLD.thumbnail_url AND
      NEW.landscape_image_url       IS NOT DISTINCT FROM OLD.landscape_image_url AND
      NEW.image_urls                IS NOT DISTINCT FROM OLD.image_urls AND
      NEW.is_active                 IS NOT DISTINCT FROM OLD.is_active AND
      NEW.is_archived               IS NOT DISTINCT FROM OLD.is_archived AND
      NEW.is_featured               IS NOT DISTINCT FROM OLD.is_featured AND
      NEW.category_id               IS NOT DISTINCT FROM OLD.category_id AND
      NEW.tags                      IS NOT DISTINCT FROM OLD.tags AND
      NEW.occasion_tags             IS NOT DISTINCT FROM OLD.occasion_tags AND
      NEW.sku_pattern               IS NOT DISTINCT FROM OLD.sku_pattern AND
      NEW.meta_title                IS NOT DISTINCT FROM OLD.meta_title AND
      NEW.meta_description          IS NOT DISTINCT FROM OLD.meta_description AND
      NEW.published_at              IS NOT DISTINCT FROM OLD.published_at AND
      NEW.is_customizable           IS NOT DISTINCT FROM OLD.is_customizable AND
      NEW.customization_label       IS NOT DISTINCT FROM OLD.customization_label AND
      NEW.meta_item_id              IS NOT DISTINCT FROM OLD.meta_item_id AND
      NEW.meta_synced_at            IS NOT DISTINCT FROM OLD.meta_synced_at AND
      NEW.meta_sync_error           IS NOT DISTINCT FROM OLD.meta_sync_error
      -- Only base_price and/or updated_at (and any other auto-columns) differ
    ) THEN
      -- This is a derived/auto update only — SKU trigger already handling sync
      RETURN NEW;
    END IF;
  END IF;

  -- ── Normal sync path ───────────────────────────────────────────────────────
  v_secret := public.get_app_secret('supabase_webhook_secret');
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'app_secrets.supabase_webhook_secret is not configured; skipping meta sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_body := jsonb_build_object(
    'type',       TG_OP,
    'table',      'shelf_products',
    'record',     CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );

  BEGIN
    PERFORM net.http_post(
      url     => 'https://flux3d.in/api/meta/catalog-sync',
      headers => jsonb_build_object(
        'Content-type',       'application/json',
        'Authorization',      'Bearer ' || v_secret,
        'x-meta-catalog-sync', 'v1'
      ),
      body                => v_body,
      timeout_milliseconds => 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'meta product sync enqueue failed: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- shelf_skus trigger unchanged — recreate defensively
CREATE OR REPLACE FUNCTION public.sync_skus_to_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_body   JSONB;
BEGIN
  v_secret := public.get_app_secret('supabase_webhook_secret');
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'app_secrets.supabase_webhook_secret is not configured; skipping meta sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_body := jsonb_build_object(
    'type',       TG_OP,
    'table',      'shelf_skus',
    'record',     CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );

  BEGIN
    PERFORM net.http_post(
      url     => 'https://flux3d.in/api/meta/catalog-sync',
      headers => jsonb_build_object(
        'Content-type',        'application/json',
        'Authorization',       'Bearer ' || v_secret,
        'x-meta-catalog-sync', 'v1'
      ),
      body                => v_body,
      timeout_milliseconds => 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'meta sku sync enqueue failed: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate triggers (idempotent)
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
