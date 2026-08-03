-- ============================================================================
-- Migration: Harden account linking (security advisory pass)
-- Date: 2026-08-05
-- Purpose:
--   * account_linking_merge_to_user: revoke `authenticated` EXECUTE — every
--     production caller uses the service_role admin client (audited:
--     src/app/link/actions.ts, src/app/auth/callback/route.ts,
--     src/app/api/admin/account-linking/merge/route.ts,
--     src/lib/account-linking/merge.ts). Adds a defense-in-depth guard that
--     rejects any call whose JWT role is not service_role, closing an
--     arbitrary order-ownership reassignment vector if the grant were ever
--     re-added.
--
-- NOTE (index): the plan's `uq_link_requests_active_phone` partial predicate
-- `confirmed_at IS NULL AND expires_at > NOW()` cannot be built — partial
-- index predicates must be IMMUTABLE and NOW() is STABLE. The shipped index
-- stays `WHERE confirmed_at IS NULL`; the one-pending-row-per-phone guarantee
-- is already enforced because createLinkRequest deletes stale unconfirmed
-- rows for the phone before inserting (src/lib/account-linking/link-requests.ts).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. account_linking_merge_to_user: service_role only + in-function guard
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
  v_attributed_shelf BIGINT;
  v_attributed_custom BIGINT;
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
  UPDATE public.shelf_orders
  SET user_id = p_target_user_id,
      order_source = COALESCE(order_source, 'whatsapp')
  WHERE shipping_address IS NOT NULL
    AND right(regexp_replace((shipping_address->>'phone')::text, '[^0-9]', '', 'g'), 10)
        = right(regexp_replace(p_phone::text, '[^0-9]', '', 'g'), 10)
    AND user_id <> p_target_user_id;

  GET DIAGNOSTICS v_attributed_shelf = ROW_COUNT;

  -- 2. orders (custom 3D print orders) — matches on the top-level phone column
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
REVOKE EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) TO service_role;
