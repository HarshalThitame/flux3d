-- ============================================================
-- Migration: Coupon Redemption Tracking
-- Fixes: used_count never incremented for shop orders;
--        adds atomic RPC to avoid read-modify-write races.
-- ============================================================

-- 1. Atomic increment for coupons.used_count
--    Called from place-order.ts after a successful shop order.
--    Drop first to avoid "cannot change name of input parameter" error
--    if a prior version existed with different param names.
DROP FUNCTION IF EXISTS increment_coupon_used_count(UUID);

CREATE OR REPLACE FUNCTION increment_coupon_used_count(coupon_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE coupons
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = coupon_id;
$$;

-- Grant execute to the service role (used by admin client in place-order.ts)
GRANT EXECUTE ON FUNCTION increment_coupon_used_count(UUID) TO service_role;

-- 2. Ensure redemptions table has order_id FK to shelf_orders if missing
--    (defensive: only adds the column/index if not already present)
DO $$
BEGIN
  -- Ensure order_id column exists on redemptions (may already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'redemptions'
      AND column_name = 'order_id'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN order_id TEXT;
  END IF;
END;
$$;

-- Index on redemptions.order_id for fast lookup in loadOrderDiscountSummary
CREATE INDEX IF NOT EXISTS idx_redemptions_order_id ON redemptions (order_id);

-- Index on redemptions.coupon_id + user_id for per-user usage checks
CREATE INDEX IF NOT EXISTS idx_redemptions_coupon_user ON redemptions (coupon_id, user_id);

-- Index on redemptions.offer_id + user_id for per-user offer usage checks
CREATE INDEX IF NOT EXISTS idx_redemptions_offer_user ON redemptions (offer_id, user_id);

-- 3. Ensure coupons.used_count has a non-null default (defensive)
ALTER TABLE coupons ALTER COLUMN used_count SET DEFAULT 0;

UPDATE coupons SET used_count = 0 WHERE used_count IS NULL;
