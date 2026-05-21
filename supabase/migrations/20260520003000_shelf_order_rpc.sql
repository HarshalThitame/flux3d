CREATE OR REPLACE FUNCTION public.create_shelf_order_atomic(
  p_user_id UUID,
  p_order_number TEXT,
  p_items JSONB,
  p_subtotal NUMERIC,
  p_discount_amount NUMERIC,
  p_coupon_code TEXT,
  p_shipping_charge NUMERIC,
  p_total_amount NUMERIC,
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
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items are required.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku_id := (v_item->>'skuId')::UUID;
    v_quantity := GREATEST(0, (v_item->>'quantity')::INTEGER);

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity.';
    END IF;

    UPDATE public.shelf_skus
    SET stock_quantity = stock_quantity - v_quantity
    WHERE id = v_sku_id
      AND stock_quantity >= v_quantity;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'Item went out of stock.';
    END IF;
  END LOOP;

  INSERT INTO public.shelf_orders (
    order_number,
    user_id,
    items,
    subtotal,
    discount_amount,
    coupon_code,
    shipping_charge,
    total_amount,
    shipping_address,
    payment_method,
    payment_status,
    order_status,
    order_source,
    placed_at
  )
  VALUES (
    p_order_number,
    p_user_id,
    p_items,
    p_subtotal,
    COALESCE(p_discount_amount, 0),
    NULLIF(UPPER(TRIM(COALESCE(p_coupon_code, ''))), ''),
    COALESCE(p_shipping_charge, 0),
    p_total_amount,
    p_shipping_address,
    'cod',
    'pending',
    'placed',
    'shop',
    NOW()
  )
  RETURNING id INTO v_order_id;

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

CREATE OR REPLACE FUNCTION public.restore_shelf_order_stock(p_items JSONB)
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
      SET stock_quantity = stock_quantity + v_quantity
      WHERE id = v_sku_id;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.create_shelf_order_atomic(UUID, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_shelf_order_stock(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_shelf_order_atomic(UUID, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_shelf_order_stock(JSONB) TO service_role;
