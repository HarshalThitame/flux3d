-- Financial snapshots are written in the same transaction as stock and promotions.
ALTER TABLE public.shelf_orders ADD COLUMN IF NOT EXISTS checkout_key text;
ALTER TABLE public.shelf_orders ADD COLUMN IF NOT EXISTS pricing_fingerprint text;
CREATE UNIQUE INDEX IF NOT EXISTS shelf_orders_checkout_key_unique ON public.shelf_orders(checkout_key) WHERE checkout_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.shop_promotion_reservations (
  order_id uuid NOT NULL REFERENCES public.shelf_orders(id) ON DELETE CASCADE,
  source_table text NOT NULL CHECK (source_table IN ('shelf_coupons','coupons','offers')),
  promotion_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  released_at timestamptz,
  PRIMARY KEY (order_id, source_table, promotion_id)
);
ALTER TABLE public.shop_promotion_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_promotion_reservations FROM anon, authenticated;
GRANT ALL ON public.shop_promotion_reservations TO service_role;
CREATE INDEX IF NOT EXISTS shop_promotion_usage ON public.shop_promotion_reservations(source_table,promotion_id,user_id) WHERE released_at IS NULL;

CREATE OR REPLACE FUNCTION public.create_shelf_order_priced(
  p_user_id uuid, p_order_number text, p_items jsonb, p_shipping_address jsonb,
  p_snapshot jsonb, p_fingerprint text, p_checkout_key text, p_metadata jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.shelf_orders%ROWTYPE;
  v_result jsonb;
  v_order_id uuid;
  v_money jsonb := p_snapshot->'money';
  v_promo jsonb;
  v_row jsonb;
  v_limit bigint;
  v_used bigint;
  v_user_used bigint;
  v_subtotal bigint := (v_money->>'subtotalPaise')::bigint;
  v_discount bigint := (v_money->>'discountPaise')::bigint;
  v_shipping bigint := (v_money->>'shippingPaise')::bigint;
  v_tax bigint := (v_money->>'taxPaise')::bigint;
  v_total bigint := (v_money->>'totalPaise')::bigint;
  v_coupon_discount bigint := (v_money->>'couponDiscountPaise')::bigint;
  v_offer_discount bigint := (v_money->>'offerDiscountPaise')::bigint;
  v_cgst bigint := (v_money->>'cgstPaise')::bigint;
  v_sgst bigint := (v_money->>'sgstPaise')::bigint;
BEGIN
  IF p_checkout_key IS NULL OR length(p_checkout_key) < 16 OR p_fingerprint IS NULL THEN RAISE EXCEPTION 'Invalid checkout key.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('shop-checkout:' || p_checkout_key, 0));
  SELECT * INTO v_existing FROM public.shelf_orders WHERE checkout_key = p_checkout_key;
  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM p_user_id OR
       (p_user_id IS NULL AND v_existing.guest_session_id IS DISTINCT FROM NULLIF(p_metadata->>'guest_session_id', '')::uuid) OR
       (p_user_id IS NULL AND v_existing.guest_access_token_hash IS DISTINCT FROM p_metadata->>'guest_access_token_hash') OR
       v_existing.shipping_address IS DISTINCT FROM p_shipping_address OR
       v_existing.guest_contact IS DISTINCT FROM p_metadata->'guest_contact' OR
       v_existing.pricing_fingerprint IS DISTINCT FROM p_fingerprint THEN
      RAISE EXCEPTION 'Checkout key already used for another request.';
    END IF;
    RETURN jsonb_build_object('orderId',v_existing.id,'orderNumber',v_existing.order_number);
  END IF;
  IF p_snapshot->>'version' IS DISTINCT FROM '2' OR p_snapshot->>'currency' IS DISTINCT FROM 'INR' OR
     v_subtotal IS NULL OR v_discount IS NULL OR v_shipping IS NULL OR v_tax IS NULL OR v_total IS NULL OR
     v_coupon_discount IS NULL OR v_offer_discount IS NULL OR v_cgst IS NULL OR v_sgst IS NULL OR
     LEAST(v_subtotal,v_discount,v_shipping,v_tax,v_coupon_discount,v_offer_discount,v_cgst,v_sgst) < 0 OR v_discount > v_subtotal OR v_total <= 0 OR
     v_total <> v_subtotal - v_discount + v_shipping + v_tax OR
     v_discount <> v_coupon_discount + v_offer_discount OR
     v_tax <> v_cgst + v_sgst THEN
    RAISE EXCEPTION 'Order financial breakdown does not reconcile.';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 OR
     v_subtotal IS DISTINCT FROM (SELECT SUM(round((item->>'unitPrice')::numeric * 100)::bigint * (item->>'quantity')::bigint) FROM jsonb_array_elements(p_items) item) THEN
    RAISE EXCEPTION 'Order item totals do not reconcile.';
  END IF;
  -- Lock promotion rows in a stable order. The limit check and increment cannot race.
  FOR v_promo IN SELECT value FROM jsonb_array_elements(p_snapshot->'promotions') ORDER BY value->>'table',value->>'id' LOOP
    IF v_promo->>'table' IS NULL OR v_promo->>'table' NOT IN ('shelf_coupons','coupons','offers') THEN RAISE EXCEPTION 'Invalid promotion source.'; END IF;
    EXECUTE format('SELECT to_jsonb(p) FROM public.%I p WHERE id=$1 FOR UPDATE', v_promo->>'table') INTO v_row USING (v_promo->>'id')::uuid;
    IF v_row IS NULL OR NOT COALESCE((v_row->>'is_active')::boolean,false) THEN RAISE EXCEPTION 'Promotion is no longer active. Refresh checkout.'; END IF;
    IF (v_row->>'starts_at')::timestamptz > now() OR
       (v_row->>'ends_at')::timestamptz < now() OR
       (v_row->>'expires_at')::timestamptz < now() OR
       (v_row->>'valid_from')::date > current_date OR
       (v_row->>'valid_until')::date < current_date THEN
      RAISE EXCEPTION 'Promotion dates changed. Refresh checkout.';
    END IF;
    v_limit := COALESCE((v_row->>'usage_limit')::bigint,(v_row->>'max_uses')::bigint,0);
    v_used := COALESCE((v_row->>'used_count')::bigint,0);
    IF v_limit > 0 AND v_used >= v_limit THEN RAISE EXCEPTION 'Promotion usage limit reached. Refresh checkout.'; END IF;
    IF COALESCE((v_row->>'usage_per_user')::bigint,0) > 0 THEN
      IF p_user_id IS NULL THEN RAISE EXCEPTION 'Sign in to use this promotion.'; END IF;
      SELECT count(*) INTO v_user_used FROM public.shop_promotion_reservations WHERE source_table=v_promo->>'table' AND promotion_id=(v_promo->>'id')::uuid AND user_id=p_user_id AND released_at IS NULL;
      -- Include legacy redemptions, excluding versioned reservations already counted.
      SELECT v_user_used + count(*) INTO v_user_used FROM public.redemptions r
      WHERE r.user_id=p_user_id AND (CASE WHEN v_promo->>'table'='offers' THEN r.offer_id ELSE r.coupon_id END)=(v_promo->>'id')::uuid
        AND NOT EXISTS (SELECT 1 FROM public.shop_promotion_reservations spr WHERE spr.order_id::text=r.order_id);
      IF v_user_used >= (v_row->>'usage_per_user')::bigint THEN RAISE EXCEPTION 'Promotion per-user limit reached.'; END IF;
    END IF;
  END LOOP;
  -- Empty coupon code deliberately prevents the legacy RPC incrementing both coupon tables.
  v_result := public.create_shelf_order_atomic(p_user_id,p_order_number,p_items,v_subtotal,v_discount,'',v_shipping,v_total,p_shipping_address,COALESCE(p_metadata->>'payment_provider','razorpay'));
  v_order_id := (v_result->>'orderId')::uuid;
  UPDATE public.shelf_orders SET
    checkout_key=p_checkout_key, pricing_fingerprint=p_fingerprint,
    coupon_code=NULLIF(p_snapshot->>'coupon_code',''), order_price_snapshot=p_snapshot,
    payment_snapshot=p_snapshot, payment_amount_paise=v_total, payment_currency='INR',
    payment_provider=COALESCE(p_metadata->>'payment_provider','razorpay'), payment_purpose='shop_order',
    order_source=COALESCE(p_metadata->>'order_source','shop'),
    guest_session_id=NULLIF(p_metadata->>'guest_session_id','')::uuid,
    guest_contact=p_metadata->'guest_contact', guest_access_token_hash=p_metadata->>'guest_access_token_hash',
    claim_candidate_user_id=NULLIF(p_metadata->>'claim_candidate_user_id','')::uuid
  WHERE id=v_order_id;
  FOR v_promo IN SELECT value FROM jsonb_array_elements(p_snapshot->'promotions') ORDER BY value->>'table',value->>'id' LOOP
    EXECUTE format('UPDATE public.%I SET used_count=COALESCE(used_count,0)+1 WHERE id=$1',v_promo->>'table') USING (v_promo->>'id')::uuid;
    INSERT INTO public.shop_promotion_reservations(order_id,source_table,promotion_id,user_id) VALUES(v_order_id,v_promo->>'table',(v_promo->>'id')::uuid,p_user_id);
    IF v_promo->>'table' IN ('coupons','offers') THEN
      INSERT INTO public.redemptions(user_id,order_id,coupon_id,offer_id,discount_type,discount_value,discount_applied,order_amount)
      VALUES(p_user_id,v_order_id::text,CASE WHEN v_promo->>'table'='coupons' THEN (v_promo->>'id')::uuid END,CASE WHEN v_promo->>'table'='offers' THEN (v_promo->>'id')::uuid END,
        v_promo->>'discountType',COALESCE((v_promo->>'discountValue')::numeric,(v_promo->>'discountPaise')::numeric/100),(v_promo->>'discountPaise')::numeric/100,v_subtotal/100.0);
    END IF;
  END LOOP;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_shelf_order_priced(uuid,text,jsonb,jsonb,jsonb,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_shelf_order_priced(uuid,text,jsonb,jsonb,jsonb,text,text,jsonb) TO service_role;

-- Versioned orders release only the actual promotion source, including when
-- shelf_coupons and coupons contain the same code. Legacy RPC bookkeeping is
-- retained below for orders without reservations.
CREATE OR REPLACE FUNCTION public.release_shop_promotion_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.shop_promotion_reservations%ROWTYPE;
BEGIN
  IF NEW.order_status = 'cancelled' AND OLD.order_status IS DISTINCT FROM 'cancelled' THEN
    FOR v_reservation IN
      SELECT *
      FROM public.shop_promotion_reservations
      WHERE order_id = NEW.id AND released_at IS NULL
      ORDER BY source_table, promotion_id
      FOR UPDATE
    LOOP
      EXECUTE format('UPDATE public.%I SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1) WHERE id = $1', v_reservation.source_table)
        USING v_reservation.promotion_id;

      UPDATE public.shop_promotion_reservations
      SET released_at = now()
      WHERE order_id = v_reservation.order_id
        AND source_table = v_reservation.source_table
        AND promotion_id = v_reservation.promotion_id
        AND released_at IS NULL;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_shop_promotion_reservations_on_cancel ON public.shelf_orders;
CREATE TRIGGER release_shop_promotion_reservations_on_cancel
  AFTER UPDATE OF order_status ON public.shelf_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.release_shop_promotion_reservations();

REVOKE ALL ON FUNCTION public.release_shop_promotion_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_shop_promotion_reservations() TO service_role;

-- Lock cancellation before restoring stock. Versioned promotion counters are
-- released by the trigger; legacy coupon accounting remains unchanged.
CREATE OR REPLACE FUNCTION public.cancel_shelf_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_coupon_code TEXT;
  v_promotion RECORD;
  v_item JSONB;
  v_sku_id UUID;
  v_quantity INTEGER;
BEGIN
  SELECT * INTO v_order FROM public.shelf_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF v_order.order_status = 'cancelled' THEN RAISE EXCEPTION 'Order is already cancelled.'; END IF;

  -- Creation locks promotions before SKUs; cancellation uses the same order.
  FOR v_promotion IN
    SELECT source_table, promotion_id FROM public.shop_promotion_reservations
    WHERE order_id = p_order_id AND released_at IS NULL ORDER BY source_table, promotion_id
  LOOP
    EXECUTE format('SELECT 1 FROM public.%I WHERE id=$1 FOR UPDATE', v_promotion.source_table)
      USING v_promotion.promotion_id;
  END LOOP;

  PERFORM set_config('flux.stock_reason', 'order_cancelled', true);
  PERFORM set_config('flux.stock_reference', p_order_id::TEXT, true);

  IF jsonb_typeof(v_order.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) ORDER BY value->>'skuId'
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

  v_coupon_code := NULLIF(TRIM(COALESCE(v_order.coupon_code, '')), '');
  IF v_coupon_code IS NOT NULL AND COALESCE(v_order.order_price_snapshot->>'version', '') <> '2' THEN
    UPDATE public.shelf_coupons
    SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1)
    WHERE UPPER(code) = UPPER(v_coupon_code) AND COALESCE(used_count, 0) > 0;
    IF to_regclass('public.coupons') IS NOT NULL THEN
      EXECUTE 'UPDATE public.coupons SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1)
               WHERE UPPER(code) = UPPER($1) AND COALESCE(used_count, 0) > 0'
      USING v_coupon_code;
    END IF;
  END IF;

  UPDATE public.shelf_orders
  SET order_status = 'cancelled', cancellation_reason = p_reason, updated_at = NOW()
  WHERE id = p_order_id;

  PERFORM set_config('flux.stock_reason', '', true);
  PERFORM set_config('flux.stock_reference', '', true);
  RETURN jsonb_build_object('success', true, 'orderId', p_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_shelf_order(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_shelf_order(uuid,text) TO service_role;
