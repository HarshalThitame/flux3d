-- ============================================================================
-- Stock Management — audit ledger, low-stock alerts, reorder points
-- Enterprise-grade inventory tracking for the 3D Shop
-- ============================================================================

-- ============================================================================
-- 1. Stock movements audit ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES public.shelf_skus(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta <> 0),
  previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity INTEGER NOT NULL DEFAULT 0,
  reason_type TEXT NOT NULL DEFAULT 'system' CHECK (reason_type IN (
    'order_placed',
    'order_cancelled',
    'order_returned',
    'reservation_expired',
    'manual_adjust',
    'restock',
    'release',
    'system'
  )),
  reference_id TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_sku_created
  ON public.stock_movements(sku_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created
  ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reason
  ON public.stock_movements(reason_type);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_service_role" ON public.stock_movements;
CREATE POLICY "stock_movements_service_role"
  ON public.stock_movements
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. Trigger — capture every stock_quantity change on shelf_skus
--    Reason is read from the transaction-local setting `flux.stock_reason`
--    set by the order-flow RPCs and admin RPCs below. Direct DB edits fall
--    back to 'system'.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_log_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_reason TEXT;
  v_delta INTEGER;
BEGIN
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    v_delta := NEW.stock_quantity - OLD.stock_quantity;
    IF v_delta = 0 THEN
      RETURN NEW;
    END IF;
    v_reason := COALESCE(
      NULLIF(current_setting('flux.stock_reason', true), ''),
      'system'
    );
    INSERT INTO public.stock_movements (
      sku_id, product_id, quantity_delta, previous_quantity, new_quantity,
      reason_type, reference_id, note, created_at
    )
    VALUES (
      NEW.id, NEW.product_id, v_delta, OLD.stock_quantity, NEW.stock_quantity,
      v_reason, current_setting('flux.stock_reference', true), NULL, NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shelf_skus_log_stock_movement ON public.shelf_skus;
CREATE TRIGGER trg_shelf_skus_log_stock_movement
  AFTER UPDATE OF stock_quantity ON public.shelf_skus
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_stock_movement();

-- ============================================================================
-- 3. Reorder point (falls back to low_stock_threshold at query time)
-- ============================================================================
ALTER TABLE public.shelf_skus
  ADD COLUMN IF NOT EXISTS reorder_point INTEGER;

-- ============================================================================
-- 4. Modify order-flow RPCs to annotate movements with a reason
--    NOTE: signatures, body logic, and grants are unchanged — only the reason
--    set_config calls are added so the ledger captures accurate context.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_shelf_order_atomic(
  p_user_id UUID,
  p_order_number TEXT,
  p_items JSONB,
  p_subtotal_paise BIGINT,
  p_discount_amount_paise BIGINT,
  p_coupon_code TEXT,
  p_shipping_charge_paise BIGINT,
  p_total_amount_paise BIGINT,
  p_shipping_address JSONB,
  p_payment_method TEXT DEFAULT 'razorpay'
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

  PERFORM set_config('flux.stock_reason', 'order_placed', true);

  -- Acquire row locks in deterministic (skuId) order before mutating any stock.
  -- Without this, two concurrent carts containing the same SKUs in different
  -- array orders can deadlock inside the UPDATE loop below.
  FOR v_item IN (
    SELECT * FROM jsonb_array_elements(p_items)
    ORDER BY (v_item->>'skuId')::UUID
  )
  LOOP
    v_sku_id := (v_item->>'skuId')::UUID;
    PERFORM 1 FROM public.shelf_skus WHERE id = v_sku_id FOR UPDATE;
  END LOOP;

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
    p_shipping_address, p_payment_method, 'pending', 'placed', 'pending', 'shop', NOW(),
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

  PERFORM set_config('flux.stock_reason', '', true);

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'orderNumber', p_order_number
  );
END;
$$;

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

  PERFORM set_config('flux.stock_reason', 'order_returned', true);
  PERFORM set_config('flux.stock_reference', COALESCE(p_order_id::TEXT, ''), true);

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

  PERFORM set_config('flux.stock_reason', '', true);
  PERFORM set_config('flux.stock_reference', '', true);
END;
$$;

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

  PERFORM set_config('flux.stock_reason', 'order_cancelled', true);
  PERFORM set_config('flux.stock_reference', p_order_id::TEXT, true);

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

  PERFORM set_config('flux.stock_reason', '', true);
  PERFORM set_config('flux.stock_reference', '', true);

  RETURN jsonb_build_object('success', true, 'orderId', p_order_id);
END;
$$;

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
  v_order_id UUID;
BEGIN
  -- Mark every expired active reservation as 'expired'. Stock restoration is
  -- handled exactly once per order by cancel_shelf_order() below, which reads
  -- the authoritative order.items snapshot. (Previously this function also
  -- restored stock directly AND then called cancel_shelf_order, which restored
  -- it a second time — a double-restore that inflated stock levels.)
  FOR v_rec IN
    SELECT ir.id, ir.sku_id, ir.order_id, ir.quantity
    FROM public.inventory_reservations ir
    WHERE ir.status = 'active'
      AND ir.expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.inventory_reservations
    SET status = 'expired'
    WHERE id = v_rec.id;

    reservation_id := v_rec.id;
    order_id := v_rec.order_id;
    sku_id := v_rec.sku_id;
    quantity_restored := v_rec.quantity;
    RETURN NEXT;
  END LOOP;

  -- Cancel each affected order exactly once (this restores stock and cancels
  -- any remaining active reservations). Deduplicate by order_id so a multi-SKU
  -- order is never cancelled twice.
  FOR v_order_id IN
    SELECT DISTINCT order_id
    FROM public.inventory_reservations
    WHERE status = 'expired'
  LOOP
    BEGIN
      PERFORM public.cancel_shelf_order(v_order_id, 'Stock reservation expired.');
    EXCEPTION WHEN OTHERS THEN
      -- Order may already be cancelled or concurrently processed elsewhere.
      -- stock was already restored for it, so skip without failing the batch.
    END;
  END LOOP;
END;
$$;

-- ============================================================================
-- 5. Admin RPCs — adjust stock with audit + early reservation release
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_stock(
  p_sku_id UUID,
  p_quantity_delta INTEGER,
  p_reason TEXT DEFAULT 'manual_adjust',
  p_note TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
BEGIN
  IF p_quantity_delta = 0 THEN
    RAISE EXCEPTION 'Quantity delta must be non-zero.';
  END IF;

  IF NOT (p_reason IN ('manual_adjust', 'restock', 'release', 'order_cancelled', 'order_returned')) THEN
    RAISE EXCEPTION 'Invalid reason type.';
  END IF;

  SELECT stock_quantity INTO v_current
  FROM public.shelf_skus
  WHERE id = p_sku_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SKU not found.';
  END IF;

  v_new := GREATEST(0, v_current + p_quantity_delta);

  IF v_new = v_current THEN
    RAISE EXCEPTION 'Adjustment would set quantity below zero.';
  END IF;

  PERFORM set_config('flux.stock_reason', p_reason, true);
  PERFORM set_config('flux.stock_reference', COALESCE(p_reference, ''), true);

  UPDATE public.shelf_skus
  SET stock_quantity = v_new
  WHERE id = p_sku_id;

  PERFORM set_config('flux.stock_reason', '', true);
  PERFORM set_config('flux.stock_reference', '', true);

  -- Attach the actor/note to the movement just created by the trigger.
  -- Match on sku + reason + delta + latest timestamp for precision.
  UPDATE public.stock_movements
  SET actor_id = p_actor_id, note = p_note
  WHERE sku_id = p_sku_id
    AND reason_type = p_reason
    AND quantity_delta = p_quantity_delta
    AND created_at = (
      SELECT MAX(created_at) FROM public.stock_movements
      WHERE sku_id = p_sku_id AND reason_type = p_reason
    );

  RETURN jsonb_build_object(
    'success', true,
    'sku_id', p_sku_id,
    'previous_quantity', v_current,
    'new_quantity', v_new,
    'quantity_delta', p_quantity_delta
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_reservation(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM public.inventory_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found.';
  END IF;

  IF v_res.status <> 'active' THEN
    RAISE EXCEPTION 'Reservation is not active.';
  END IF;

  PERFORM set_config('flux.stock_reason', 'release', true);
  PERFORM set_config('flux.stock_reference', p_reservation_id::TEXT, true);

  -- Restore stock + release reservation hold
  UPDATE public.shelf_skus
  SET stock_quantity = stock_quantity + v_res.quantity,
      reserved_quantity = GREATEST(0, reserved_quantity - v_res.quantity)
  WHERE id = v_res.sku_id;

  UPDATE public.inventory_reservations
  SET status = 'cancelled', cancelled_at = NOW()
  WHERE id = p_reservation_id;

  PERFORM set_config('flux.stock_reason', '', true);
  PERFORM set_config('flux.stock_reference', '', true);

  RETURN jsonb_build_object('success', true, 'reservationId', p_reservation_id);
END;
$$;

-- ============================================================================
-- 6. Low-stock alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES public.shelf_skus(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  stock_at_alert INTEGER NOT NULL DEFAULT 0,
  notified_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_status_created
  ON public.stock_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_sku
  ON public.stock_alerts(sku_id);

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_alerts_service_role" ON public.stock_alerts;
CREATE POLICY "stock_alerts_service_role"
  ON public.stock_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. RPC to recompute alerts (used by cron + manual refresh)
--    Creates new alerts for SKUs below threshold (deduped by open alert),
--    resolves open alerts when stock recovers.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recompute_stock_alerts()
RETURNS TABLE(
  inserted INTEGER,
  resolved INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_resolved INTEGER := 0;
  v_rec RECORD;
  v_threshold INTEGER;
  v_type TEXT;
  v_severity TEXT;
  v_message TEXT;
  v_existing UUID;
BEGIN
  -- Resolve open alerts for SKUs that have recovered above threshold
  FOR v_rec IN
    SELECT a.id
    FROM public.stock_alerts a
    JOIN public.shelf_skus s ON s.id = a.sku_id
    WHERE a.status IN ('open', 'acknowledged')
      AND a.alert_type = 'low_stock'
      AND s.stock_quantity > COALESCE(NULLIF(s.reorder_point, 0), COALESCE(s.low_stock_threshold, 5))
  LOOP
    UPDATE public.stock_alerts
    SET status = 'resolved', resolved_at = NOW()
    WHERE id = v_rec.id;
    v_resolved := v_resolved + 1;
  END LOOP;

  -- Resolve out_of_stock alerts for SKUs back in stock
  FOR v_rec IN
    SELECT a.id
    FROM public.stock_alerts a
    JOIN public.shelf_skus s ON s.id = a.sku_id
    WHERE a.status IN ('open', 'acknowledged')
      AND a.alert_type = 'out_of_stock'
      AND s.stock_quantity > 0
  LOOP
    UPDATE public.stock_alerts
    SET status = 'resolved', resolved_at = NOW()
    WHERE id = v_rec.id;
    v_resolved := v_resolved + 1;
  END LOOP;

  -- Insert new alerts for low/out of stock SKUs (skip if open alert exists)
  FOR v_rec IN
    SELECT s.id, s.product_id, s.stock_quantity,
           COALESCE(NULLIF(s.reorder_point, 0), COALESCE(s.low_stock_threshold, 5)) AS threshold,
           p.name AS product_name,
           s.sku_code,
           s.is_available,
           p.is_archived
    FROM public.shelf_skus s
    JOIN public.shelf_products p ON p.id = s.product_id
    WHERE s.is_available <> false
      AND COALESCE(p.is_archived, false) = false
  LOOP
    CONTINUE WHEN v_rec.is_available = false OR v_rec.is_archived;

    IF v_rec.stock_quantity <= 0 THEN
      v_type := 'out_of_stock';
      v_severity := 'critical';
      v_message := format('%s (%s) is out of stock.', v_rec.product_name, v_rec.sku_code);
    ELSIF v_rec.stock_quantity <= v_rec.threshold THEN
      v_type := 'low_stock';
      v_severity := CASE
        WHEN v_rec.stock_quantity <= GREATEST(1, round(v_rec.threshold * 0.4)) THEN 'critical'
        ELSE 'warning'
      END;
      v_message := format('%s (%s) is low on stock: %s left (threshold %s).', v_rec.product_name, v_rec.sku_code, v_rec.stock_quantity, v_rec.threshold);
    ELSE
      CONTINUE;
    END IF;

    SELECT a.id INTO v_existing
    FROM public.stock_alerts a
    WHERE a.sku_id = v_rec.id
      AND a.alert_type = v_type
      AND a.status IN ('open', 'acknowledged')
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.stock_alerts (sku_id, product_id, alert_type, severity, message, stock_at_alert)
      VALUES (v_rec.id, v_rec.product_id, v_type, v_severity, v_message, v_rec.stock_quantity);
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_resolved;
END;
$$;

-- ============================================================================
-- 8. Email type extension — stock_alert digest
-- ============================================================================
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'welcome',
    'email_verification',
    'password_reset',
    'order_placed_customer',
    'order_placed_admin',
    'model_validation_pass',
    'model_validation_fail',
    'production_started',
    'order_shipped',
    'delivery_confirmation',
    'payment_receipt',
    'payment_failed',
    'refund_issued',
    'contact_notification',
    'account_link_confirmation',
    'stock_alert',
    'back_in_stock'
  ));

-- ============================================================================
-- 9. Grant audit/admin RPCs
-- ============================================================================
REVOKE ALL ON FUNCTION public.admin_adjust_stock(UUID, INTEGER, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_reservation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_stock_alerts() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(UUID, INTEGER, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_reservation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_stock_alerts() TO service_role;
