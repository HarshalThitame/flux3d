-- ============================================================================
-- RPC: update_base_price_no_sync
--
-- Updates shelf_products.base_price to the minimum available SKU price WITHOUT
-- firing the shelf_products_meta trigger (which would cause a second, duplicate
-- Meta catalog sync alongside the shelf_skus_meta trigger that already fired
-- for the SKU INSERT/UPDATE that prompted this base_price update).
--
-- Root cause of the double-sync bug:
--   1. Admin inserts/updates a SKU → shelf_skus_meta trigger fires → webhook
--      calls syncProduct() which pushes to Meta catalog (correct, 1st call).
--   2. Server then calls UPDATE shelf_products SET base_price = <min_price>
--      → shelf_products_meta trigger fires → webhook calls syncProduct() AGAIN
--      (duplicate, 2nd call) → Commerce Manager shows "2 content entries".
--
-- Fix: This function uses SET LOCAL session_replication_role = 'replica' to
-- disable all triggers for the duration of the base_price UPDATE, so that only
-- the SKU trigger's sync reaches Meta (not a second product-level sync).
--
-- IMPORTANT: session_replication_role = 'replica' disables ALL triggers for the
-- current transaction. This is safe here because:
--   • The SKU trigger (which fires first and is already in flight) handles the
--     full product sync including the updated price.
--   • base_price is a derived / auto-computed field, not a user-intent change.
--   • If you add other triggers to shelf_products in the future that must fire
--     on base_price changes, move their logic into this function instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_base_price_no_sync(
  p_product_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_price NUMERIC;
BEGIN
  -- Find the lowest price among all available SKUs for this product.
  SELECT MIN(price)
    INTO v_min_price
    FROM shelf_skus
   WHERE product_id  = p_product_id
     AND is_available = true;

  -- If there are no available SKUs, leave base_price unchanged.
  IF v_min_price IS NULL THEN
    RETURN;
  END IF;

  -- Temporarily disable triggers so the shelf_products_meta trigger does NOT fire.
  -- The SKU-level trigger that initiated this update already handles the Meta sync.
  SET LOCAL session_replication_role = 'replica';

  UPDATE shelf_products
     SET base_price = v_min_price
   WHERE id = p_product_id
     AND base_price IS DISTINCT FROM v_min_price; -- skip if already correct

  -- session_replication_role reverts to 'origin' automatically at end of transaction.
END;
$$;

-- Only the server-side service_role (admin API routes) should call this.
REVOKE EXECUTE ON FUNCTION public.update_base_price_no_sync(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_base_price_no_sync(UUID) TO service_role;

COMMENT ON FUNCTION public.update_base_price_no_sync(UUID) IS
  'Updates shelf_products.base_price to the minimum available SKU price without '
  'firing the shelf_products_meta trigger. Prevents the double Meta catalog sync '
  'caused by SKU route calling both shelf_skus INSERT (fires sku trigger) and then '
  'shelf_products UPDATE (fires product trigger).';
