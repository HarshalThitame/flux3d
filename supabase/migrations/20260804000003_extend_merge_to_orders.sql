-- ============================================================================
-- Migration: Extend account_linking_merge_to_user to include custom orders table
-- Date: 2026-08-04
-- Purpose: Reassign both shelf_orders and orders (3D print orders) by phone
-- ============================================================================

-- Extend the atomic merge function to also reassign custom orders table rows
CREATE OR REPLACE FUNCTION public.account_linking_merge_to_user(
  p_target_user_id UUID,
  p_phone TEXT
) RETURNS TABLE(orders_attributed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attributed_shelf BIGINT;
  v_attributed_custom BIGINT;
BEGIN
  IF p_target_user_id IS NULL OR p_phone IS NULL OR p_phone = '' THEN
    RETURN QUERY SELECT 0::BIGINT;
    RETURN;
  END IF;

  -- 1. shelf_orders (WhatsApp shelf orders) - matches on shipping_address->>'phone'
  UPDATE public.shelf_orders
  SET user_id = p_target_user_id,
      order_source = COALESCE(order_source, 'whatsapp')
  WHERE shipping_address IS NOT NULL
    AND right(regexp_replace((shipping_address->>'phone')::text, '[^0-9]', '', 'g'), 10)
        = right(regexp_replace(p_phone::text, '[^0-9]', '', 'g'), 10)
    AND user_id <> p_target_user_id;

  GET DIAGNOSTICS v_attributed_shelf = ROW_COUNT;

  -- 2. orders (custom 3D print orders) - matches on top-level phone column
  UPDATE public.orders
  SET user_id = p_target_user_id
  WHERE phone IS NOT NULL
    AND phone <> ''
    AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
        = right(regexp_replace(p_phone::text, '[^0-9]', '', 'g'), 10)
    AND user_id <> p_target_user_id;

  GET DIAGNOSTICS v_attributed_custom = ROW_COUNT;

  RETURN QUERY SELECT (v_attributed_shelf + v_attributed_custom)::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) TO service_role, authenticated;