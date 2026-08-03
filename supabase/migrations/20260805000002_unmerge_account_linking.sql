-- ============================================================================
-- Migration: track imported orders + reverse (unmerge) on WhatsApp unlink
-- Date: 2026-08-05
-- Purpose:
--   * account_linking_imports: records which order ids were reassigned to a
--     user during each successful merge, so unlinking can detach exactly
--     those rows from the user's 3D-shop orders again.
--   * account_linking_merge_to_user: extended to record the imported ids
--     (same signature / return type; service_role guard preserved).
--   * account_linking_unmerge_from_user: new RPC that re-homes previously
--     imported orders on the synthetic WhatsApp guest (p_guest_user_id) when
--     the WhatsApp number is unlinked — shelf_orders.user_id is NOT NULL, so
--     orders cannot be detached from the account by setting it to NULL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. account_linking_imports — audit trail of imported order ids
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_linking_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  order_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_link_imports_user ON public.account_linking_imports(user_id);

ALTER TABLE public.account_linking_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_linking_imports_service_role_full_access" ON public.account_linking_imports;
CREATE POLICY "account_linking_imports_service_role_full_access"
  ON public.account_linking_imports FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. account_linking_merge_to_user — now also records imported order ids
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.account_linking_merge_to_user(
  p_target_user_id UUID,
  p_phone TEXT
) RETURNS TABLE(orders_attributed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shelf_ids UUID[] := '{}'::UUID[];
  v_custom_ids UUID[] := '{}'::UUID[];
  v_ids UUID[] := '{}'::UUID[];
BEGIN
  -- Only the service role may reassign orders; authenticated/anon JWTs
  -- are rejected even if the EXECUTE grant is ever re-added.
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RETURN QUERY SELECT 0::BIGINT;
    RETURN;
  END IF;

  IF p_target_user_id IS NULL OR p_phone IS NULL OR p_phone = '' THEN
    RETURN QUERY SELECT 0::BIGINT;
    RETURN;
  END IF;

  -- 1. shelf_orders (WhatsApp shelf orders) — matches shipping_address->>'phone'
  WITH moved AS (
    UPDATE public.shelf_orders
    SET user_id = p_target_user_id,
        order_source = COALESCE(order_source, 'whatsapp')
    WHERE shipping_address IS NOT NULL
      AND right(regexp_replace((shipping_address->>'phone')::text, '[^0-9]', '', 'g'), 10)
          = right(regexp_replace(p_phone::text, '[^0-9]', '', 'g'), 10)
      AND user_id <> p_target_user_id
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), '{}'::UUID[]) INTO v_shelf_ids FROM moved;

  -- 2. orders (custom 3D print orders) — matches on the top-level phone column
  WITH moved AS (
    UPDATE public.orders
    SET user_id = p_target_user_id
    WHERE phone IS NOT NULL
      AND phone <> ''
      AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
          = right(regexp_replace(p_phone::text, '[^0-9]', '', 'g'), 10)
      AND user_id <> p_target_user_id
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), '{}'::UUID[]) INTO v_custom_ids FROM moved;

  v_ids := v_shelf_ids || v_custom_ids;

  IF array_length(v_ids, 1) IS NOT NULL THEN
    INSERT INTO public.account_linking_imports (user_id, phone, order_ids)
    VALUES (p_target_user_id, p_phone, v_ids);
  END IF;

  RETURN QUERY SELECT array_length(v_ids, 1)::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. account_linking_unmerge_from_user — detach imported orders on unlink
--    Orders are re-homed on the synthetic WhatsApp guest (p_guest_user_id)
--    because shelf_orders.user_id is NOT NULL.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.account_linking_unmerge_from_user(
  p_user_id UUID,
  p_phone TEXT,
  p_guest_user_id UUID
) RETURNS TABLE(orders_detached BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_delta BIGINT;
  v_count BIGINT := 0;
  v_phone_last10 TEXT;
BEGIN
  -- Only the service role may detach orders.
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RETURN QUERY SELECT 0::BIGINT;
    RETURN;
  END IF;

  IF p_user_id IS NULL OR p_guest_user_id IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT;
    RETURN;
  END IF;

  -- 1. Re-home every previously imported order (exact ids recorded at merge time)
  FOR v_rec IN
    SELECT order_ids FROM public.account_linking_imports
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
  LOOP
    UPDATE public.shelf_orders SET user_id = p_guest_user_id
    WHERE id = ANY(v_rec.order_ids) AND user_id = p_user_id;
    GET DIAGNOSTICS v_delta = ROW_COUNT;
    v_count := v_count + v_delta;

    UPDATE public.orders SET user_id = p_guest_user_id
    WHERE id = ANY(v_rec.order_ids) AND user_id = p_user_id;
    GET DIAGNOSTICS v_delta = ROW_COUNT;
    v_count := v_count + v_delta;
  END LOOP;

  -- 2. Legacy fallback: whatsapp-source shelf orders matching the phone that
  --    were merged before the imports table existed. Idempotent — skips any
  --    id already handled above.
  v_phone_last10 := right(regexp_replace(p_phone::text, '[^0-9]', '', 'g'), 10);
  IF v_phone_last10 <> '' THEN
    UPDATE public.shelf_orders SET user_id = p_guest_user_id
    WHERE user_id = p_user_id
      AND order_source = 'whatsapp'
      AND shipping_address IS NOT NULL
      AND right(regexp_replace((shipping_address->>'phone')::text, '[^0-9]', '', 'g'), 10) = v_phone_last10
      AND id NOT IN (
        SELECT unnest(order_ids) FROM public.account_linking_imports WHERE user_id = p_user_id
      );
    GET DIAGNOSTICS v_delta = ROW_COUNT;
    v_count := v_count + v_delta;
  END IF;

  -- 3. Clear the import trail so a re-link starts fresh
  DELETE FROM public.account_linking_imports WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.account_linking_unmerge_from_user(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.account_linking_unmerge_from_user(uuid, text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_linking_unmerge_from_user(uuid, text, uuid) TO service_role;
