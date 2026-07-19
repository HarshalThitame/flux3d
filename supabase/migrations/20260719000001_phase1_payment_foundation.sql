-- Phase 1 — Payment & Order Foundation
-- Inventory reservations, paise columns, state machine separation, transactional cancellation

-- ============================================================
-- 1. Inventory reservations table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES shelf_skus(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES shelf_orders(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  converted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON public.inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_sku_status ON public.inventory_reservations(sku_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON public.inventory_reservations(expires_at)
  WHERE status = 'active';

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Paise columns on shelf_orders (BIGINT amounts in paise)
-- ============================================================
ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS subtotal_paise BIGINT,
  ADD COLUMN IF NOT EXISTS discount_amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS shipping_charge_paise BIGINT,
  ADD COLUMN IF NOT EXISTS total_amount_paise BIGINT;

-- Backfill paise columns from existing rupee columns
UPDATE public.shelf_orders
SET
  subtotal_paise = GREATEST(0, ROUND(COALESCE(subtotal, 0) * 100)),
  discount_amount_paise = GREATEST(0, ROUND(COALESCE(discount_amount, 0) * 100)),
  shipping_charge_paise = GREATEST(0, ROUND(COALESCE(shipping_charge, 0) * 100)),
  total_amount_paise = GREATEST(0, ROUND(COALESCE(total_amount, 0) * 100))
WHERE subtotal_paise IS NULL;

-- ============================================================
-- 3. Fulfilment status column (separate from order lifecycle)
-- ============================================================
ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS fulfilment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfilment_status IN ('pending', 'processing', 'packing', 'packed', 'shipped', 'delivering', 'delivered'));

-- ============================================================
-- 4. Narrow order_status to lifecycle-only values
-- ============================================================
-- Migrate existing rows: set order_status to lifecycle values and backfill fulfilment_status
UPDATE public.shelf_orders
SET
  order_status = CASE
    WHEN order_status IN ('packed', 'shipped', 'delivered') THEN 'confirmed'
    ELSE order_status
  END,
  fulfilment_status = CASE
    WHEN order_status = 'placed' THEN 'pending'
    WHEN order_status = 'confirmed' THEN 'processing'
    WHEN order_status = 'packed' THEN 'packed'
    WHEN order_status = 'shipped' THEN 'shipped'
    WHEN order_status = 'delivered' THEN 'delivered'
    ELSE 'pending'
  END
WHERE order_status IS NOT NULL;

ALTER TABLE public.shelf_orders
  DROP CONSTRAINT IF EXISTS shelf_orders_order_status_check;

ALTER TABLE public.shelf_orders
  ADD CONSTRAINT shelf_orders_order_status_check
    CHECK (order_status IN ('placed', 'confirmed', 'cancelled', 'return_requested', 'returned'));

-- ============================================================
-- 5. Shipping rules paise column
-- ============================================================
ALTER TABLE public.shipping_rules
  ADD COLUMN IF NOT EXISTS charge_paise BIGINT NOT NULL DEFAULT 0;

UPDATE public.shipping_rules
SET charge_paise = GREATEST(0, ROUND(COALESCE(charge, 0) * 100))
WHERE charge_paise = 0 AND charge IS NOT NULL AND charge > 0;

-- ============================================================
-- 6. Reserved quantity on shelf_skus (informational)
-- ============================================================
ALTER TABLE public.shelf_skus
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 7. REWRITE: create_shelf_order_atomic — paise, reservations, no coupon increment
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_shelf_order_atomic(
  p_user_id UUID,
  p_order_number TEXT,
  p_items JSONB,
  p_subtotal_paise BIGINT,
  p_discount_amount_paise BIGINT,
  p_coupon_code TEXT,
  p_shipping_charge_paise BIGINT,
  p_total_amount_paise BIGINT,
  p_shipping_address JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_sku_id UUID;
  v_quantity INTEGER;
  v_order_id UUID;
  v_updated INTEGER;
  v_ttl_minutes INTEGER := 1440; -- 24 hours reservation TTL
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items are required.';
  END IF;

  -- Decrement stock and reserve
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku_id := (v_item->>'skuId')::UUID;
    v_quantity := GREATEST(0, (v_item->>'quantity')::INTEGER);

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity.';
    END IF;

    UPDATE public.shelf_skus
    SET stock_quantity = stock_quantity - v_quantity,
        reserved_quantity = reserved_quantity + v_quantity
    WHERE id = v_sku_id
      AND stock_quantity >= v_quantity;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'Item went out of stock.';
    END IF;
  END LOOP;

  -- Create order
  INSERT INTO public.shelf_orders (
    order_number, user_id, items, subtotal, discount_amount, coupon_code,
    shipping_charge, total_amount, shipping_address, payment_method,
    payment_status, order_status, fulfilment_status, order_source, placed_at,
    subtotal_paise, discount_amount_paise, shipping_charge_paise, total_amount_paise
  )
  VALUES (
    p_order_number, p_user_id, p_items,
    p_subtotal_paise / 100.0, p_discount_amount_paise / 100.0,
    NULLIF(UPPER(TRIM(COALESCE(p_coupon_code, ''))), ''),
    p_shipping_charge_paise / 100.0, p_total_amount_paise / 100.0,
    p_shipping_address, 'cod', 'pending', 'placed', 'pending', 'shop', NOW(),
    p_subtotal_paise, p_discount_amount_paise, p_shipping_charge_paise, p_total_amount_paise
  )
  RETURNING id INTO v_order_id;

  -- Create inventory reservations
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku_id := (v_item->>'skuId')::UUID;
    v_quantity := GREATEST(0, (v_item->>'quantity')::INTEGER);

    INSERT INTO public.inventory_reservations (sku_id, order_id, quantity, status, expires_at)
    VALUES (v_sku_id, v_order_id, v_quantity, 'active', NOW() + (v_ttl_minutes || ' minutes')::INTERVAL);
  END LOOP;

  -- Increment coupon used_count at order creation (decremented on cancellation)
  IF NULLIF(TRIM(COALESCE(p_coupon_code, '')), '') IS NOT NULL THEN
    UPDATE public.shelf_coupons
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE UPPER(code) = UPPER(TRIM(p_coupon_code));

    IF to_regclass('public.coupons') IS NOT NULL THEN
      EXECUTE
        'UPDATE public.coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE UPPER(code) = UPPER(TRIM($1))'
      USING p_coupon_code;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'orderNumber', p_order_number
  );
END;
$$;

-- ============================================================
-- 8. REWRITE: restore_shelf_order_stock — also decrements reserved_quantity
-- ============================================================
CREATE OR REPLACE FUNCTION public.restore_shelf_order_stock(p_items JSONB, p_order_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_sku_id UUID;
  v_quantity INTEGER;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku_id := (v_item->>'skuId')::UUID;
    v_quantity := GREATEST(0, (v_item->>'quantity')::INTEGER);

    IF v_sku_id IS NOT NULL AND v_quantity > 0 THEN
      UPDATE public.shelf_skus
      SET stock_quantity = stock_quantity + v_quantity,
          reserved_quantity = GREATEST(0, reserved_quantity - v_quantity)
      WHERE id = v_sku_id;
    END IF;
  END LOOP;

  -- Cancel active reservations for this order if order_id provided
  IF p_order_id IS NOT NULL THEN
    UPDATE public.inventory_reservations
    SET status = 'cancelled',
        cancelled_at = NOW()
    WHERE order_id = p_order_id AND status = 'active';
  END IF;
END;
$$;

-- ============================================================
-- 9. NEW: cancel_shelf_order — transactional cancellation
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_shelf_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_coupon_code TEXT;
  v_item JSONB;
  v_sku_id UUID;
  v_quantity INTEGER;
BEGIN
  SELECT * INTO v_order FROM public.shelf_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.order_status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled.';
  END IF;

  -- 1. Restore stock and cancel reservations
  IF jsonb_typeof(v_order.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
    LOOP
      v_sku_id := (v_item->>'skuId')::UUID;
      v_quantity := GREATEST(0, (v_item->>'quantity')::INTEGER);

      IF v_sku_id IS NOT NULL AND v_quantity > 0 THEN
        UPDATE public.shelf_skus
        SET stock_quantity = stock_quantity + v_quantity,
            reserved_quantity = GREATEST(0, reserved_quantity - v_quantity)
        WHERE id = v_sku_id;
      END IF;
    END LOOP;

    UPDATE public.inventory_reservations
    SET status = 'cancelled', cancelled_at = NOW()
    WHERE order_id = p_order_id AND status = 'active';
  END IF;

  -- 2. Decrement coupon used_count if this order used one
  v_coupon_code := NULLIF(TRIM(COALESCE(v_order.coupon_code, '')), '');
  IF v_coupon_code IS NOT NULL THEN
    UPDATE public.shelf_coupons
    SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1)
    WHERE UPPER(code) = UPPER(v_coupon_code) AND COALESCE(used_count, 0) > 0;

    IF to_regclass('public.coupons') IS NOT NULL THEN
      EXECUTE
        'UPDATE public.coupons SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1)
         WHERE UPPER(code) = UPPER($1) AND COALESCE(used_count, 0) > 0'
      USING v_coupon_code;
    END IF;
  END IF;

  -- 3. Update order status
  UPDATE public.shelf_orders
  SET order_status = 'cancelled',
      cancellation_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'orderId', p_order_id);
END;
$$;

-- ============================================================
-- 10. NEW: decrement_coupon_used_count
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrement_coupon_used_count(p_coupon_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE coupons
  SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1),
      updated_at = now()
  WHERE id = p_coupon_id;
$$;

-- ============================================================
-- 11. NEW: decrement_offer_used_count
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrement_offer_used_count(p_offer_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE offers
  SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1),
      updated_at = now()
  WHERE id = p_offer_id;
$$;

-- ============================================================
-- 12. NEW: release_expired_reservations — cron-friendly cleanup
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS TABLE(
  reservation_id UUID,
  order_id UUID,
  sku_id UUID,
  quantity_restored INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT ir.id, ir.sku_id, ir.order_id, ir.quantity
    FROM public.inventory_reservations ir
    WHERE ir.status = 'active'
      AND ir.expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Restore stock
    UPDATE public.shelf_skus
    SET stock_quantity = stock_quantity + v_rec.quantity,
        reserved_quantity = GREATEST(0, reserved_quantity - v_rec.quantity)
    WHERE id = v_rec.sku_id;

    -- Mark reservation as expired
    UPDATE public.inventory_reservations
    SET status = 'expired'
    WHERE id = v_rec.id;

    -- Cancel the order
    PERFORM public.cancel_shelf_order(v_rec.order_id, 'Stock reservation expired.');

    reservation_id := v_rec.id;
    order_id := v_rec.order_id;
    sku_id := v_rec.sku_id;
    quantity_restored := v_rec.quantity;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================================
-- 13. NEW: convert_inventory_reservations
-- ============================================================
CREATE OR REPLACE FUNCTION public.convert_inventory_reservations(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT id, sku_id, quantity
    FROM public.inventory_reservations
    WHERE order_id = p_order_id AND status = 'active'
    FOR UPDATE
  LOOP
    UPDATE public.shelf_skus
    SET reserved_quantity = GREATEST(0, reserved_quantity - v_rec.quantity)
    WHERE id = v_rec.sku_id;

    UPDATE public.inventory_reservations
    SET status = 'converted', converted_at = NOW()
    WHERE id = v_rec.id;
  END LOOP;
END;
$$;

-- ============================================================
-- 14. RLS on inventory_reservations
-- ============================================================
DROP POLICY IF EXISTS "inventory_reservations_service_role" ON public.inventory_reservations;
CREATE POLICY "inventory_reservations_service_role" ON public.inventory_reservations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 15. Permission grants for new/changed RPCs
-- ============================================================
REVOKE ALL ON FUNCTION public.create_shelf_order_atomic(UUID, TEXT, JSONB, BIGINT, BIGINT, TEXT, BIGINT, BIGINT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_shelf_order_stock(JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_shelf_order(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_shelf_order_atomic(UUID, TEXT, JSONB, BIGINT, BIGINT, TEXT, BIGINT, BIGINT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_shelf_order_stock(JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_shelf_order(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_coupon_used_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_offer_used_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_inventory_reservations(UUID) TO service_role;
