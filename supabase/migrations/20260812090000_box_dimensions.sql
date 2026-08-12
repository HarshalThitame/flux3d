-- ============================================================================
-- Box / Shipping Dimensions (separate from customer-facing product dimensions)
-- Product-level + per variant option value, JSONB in mm/g base units.
-- ============================================================================

ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS box_dimensions JSONB;

COMMENT ON COLUMN public.shelf_products.box_dimensions IS
  'Corrugated shipping box dimensions JSONB: { length_mm, width_mm, height_mm, weight_g, volume_cc, dimension_unit, weight_unit }. Used for courier/Shiprocket packages; falls back to default_dimensions when unset.';

ALTER TABLE public.shelf_variant_option_dimensions
  ADD COLUMN IF NOT EXISTS box_dimensions JSONB;

COMMENT ON COLUMN public.shelf_variant_option_dimensions.box_dimensions IS
  'Corrugated shipping box dimensions JSONB for a specific option value: { length_mm, width_mm, height_mm, weight_g, volume_cc, dimension_unit, weight_unit }.';

-- Backfill: pre-fill box dimensions from existing product dimensions so
-- existing products ship with sane box sizes until edited in the UI.
UPDATE public.shelf_products
SET box_dimensions = default_dimensions
WHERE box_dimensions IS NULL
  AND default_dimensions IS NOT NULL
  AND default_dimensions <> '{}'::jsonb;

UPDATE public.shelf_variant_option_dimensions
SET box_dimensions = dimensions
WHERE box_dimensions IS NULL;