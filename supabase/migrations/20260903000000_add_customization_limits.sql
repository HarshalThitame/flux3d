-- ============================================================================
-- Add enterprise customization validation limits
-- ============================================================================

ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS customization_is_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS customization_min_length INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS customization_max_length INTEGER DEFAULT 50;

COMMENT ON COLUMN public.shelf_products.customization_is_required IS
  'If true, the customer must provide customization text to add to cart.';
COMMENT ON COLUMN public.shelf_products.customization_min_length IS
  'Minimum character length required for customization text.';
COMMENT ON COLUMN public.shelf_products.customization_max_length IS
  'Maximum character length allowed for customization text.';
