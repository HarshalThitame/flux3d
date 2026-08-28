-- ============================================================================
-- AETHER luxury variant & SKU system — follow-up
-- Add ACTIVE and DRAFT workflow statuses to shelf_skus.status.
-- 'active' is derived when a SKU is available and in stock; 'draft' when a
-- SKU's availability has not been decided yet (is_available IS NULL).
-- ============================================================================

ALTER TABLE public.shelf_skus DROP CONSTRAINT IF EXISTS shelf_skus_status_check;

ALTER TABLE public.shelf_skus
  ADD CONSTRAINT shelf_skus_status_check
  CHECK (status IS NULL OR status IN (
    'active','draft','in_stock','low_stock','out_of_stock',
    'unavailable','made_to_order','limited_edition','discontinued'
  ));