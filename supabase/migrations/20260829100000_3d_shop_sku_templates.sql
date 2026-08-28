-- ============================================================================
-- AETHER 3D-print shop — SKU pattern templates + schema hardening
-- 1. Replace the generic luxury pattern seeds with 3D-printing-native ones
-- 2. Add CHECK / UNIQUE constraints, NOT NULL, updated_at audit, comments
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. shelf_sku_pattern_templates — 3D-print seeds
-- ---------------------------------------------------------------------------
-- Deduplicate any duplicate names before adding the unique constraint.
DELETE FROM public.shelf_sku_pattern_templates a
USING public.shelf_sku_pattern_templates b
WHERE a.id > b.id AND a.name = b.name;

-- Retire the generic luxury seeds (replaced below).
DELETE FROM public.shelf_sku_pattern_templates
WHERE name IN ('Premium Classic', 'Material First', 'Monogram Luxury');

DROP INDEX IF EXISTS idx_shelf_sku_pattern_templates_category;
DROP INDEX IF EXISTS idx_shelf_sku_pattern_templates_default;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shelf_sku_pattern_templates_name_key'
      AND conrelid = 'public.shelf_sku_pattern_templates'::regclass
  ) THEN
    ALTER TABLE public.shelf_sku_pattern_templates
      ADD CONSTRAINT shelf_sku_pattern_templates_name_key UNIQUE (name);
  END IF;
END $$;

INSERT INTO public.shelf_sku_pattern_templates (name, pattern, is_default)
VALUES
  ('Material-First Classic', '{SLUG}-{MATERIAL}-{COLOR}-{SIZE}', true),
  ('Compact Code', '{SLUG}-{MATERIAL}-{COLOR}', false),
  ('Full Spec', '{SLUG}-{MATERIAL}-{COLOR}-{SIZE}-{FINISH}', false),
  ('Custom Commission', '{SLUG}-{INITIALS}-{MATERIAL}', false)
ON CONFLICT (name) DO UPDATE
  SET pattern = EXCLUDED.pattern,
      is_default = EXCLUDED.is_default;

-- ---------------------------------------------------------------------------
-- 2. shelf_sku_pricing_rules — unique rule per product + priority CHECK
-- ---------------------------------------------------------------------------
-- Deduplicate existing (product_id, name) collisions before constraining.
DELETE FROM public.shelf_sku_pricing_rules a
USING public.shelf_sku_pricing_rules b
WHERE a.id > b.id
  AND a.product_id = b.product_id
  AND a.name = b.name;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shelf_sku_pricing_rules_product_name_key'
      AND conrelid = 'public.shelf_sku_pricing_rules'::regclass
  ) THEN
    ALTER TABLE public.shelf_sku_pricing_rules
      ADD CONSTRAINT shelf_sku_pricing_rules_product_name_key
      UNIQUE (product_id, name);
  END IF;
END $$;

ALTER TABLE public.shelf_sku_pricing_rules
  DROP CONSTRAINT IF EXISTS shelf_sku_pricing_rules_priority_check;
ALTER TABLE public.shelf_sku_pricing_rules
  ADD CONSTRAINT shelf_sku_pricing_rules_priority_check
  CHECK (priority >= 0);

-- ---------------------------------------------------------------------------
-- 3. shelf_sku_tier_prices — price CHECK
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_sku_tier_prices
  DROP CONSTRAINT IF EXISTS shelf_sku_tier_prices_price_check;
ALTER TABLE public.shelf_sku_tier_prices
  ADD CONSTRAINT shelf_sku_tier_prices_price_check
  CHECK (price >= 0);

-- ---------------------------------------------------------------------------
-- 4. shelf_skus — cost_price CHECK
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_skus
  DROP CONSTRAINT IF EXISTS shelf_skus_cost_price_check;
ALTER TABLE public.shelf_skus
  ADD CONSTRAINT shelf_skus_cost_price_check
  CHECK (cost_price IS NULL OR cost_price >= 0);

-- ---------------------------------------------------------------------------
-- 5. shelf_variant_options — value_metadata NOT NULL
-- ---------------------------------------------------------------------------
UPDATE public.shelf_variant_options
SET value_metadata = '{}'::jsonb
WHERE value_metadata IS NULL;

ALTER TABLE public.shelf_variant_options
  ALTER COLUMN value_metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.shelf_variant_options
  ALTER COLUMN value_metadata SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. shelf_variant_options — updated_at audit column + trigger
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_variant_options
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS set_shelf_variant_options_updated_at
  ON public.shelf_variant_options;
CREATE TRIGGER set_shelf_variant_options_updated_at
  BEFORE UPDATE ON public.shelf_variant_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 7. Column-level documentation (id / FKs / timestamps on new tables)
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.shelf_sku_pricing_rules.id IS
  'Primary key of the pricing rule.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.product_id IS
  'Product this rule applies to.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.created_at IS
  'Timestamp when the rule was created.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.updated_at IS
  'Timestamp when the rule was last updated.';

COMMENT ON COLUMN public.shelf_sku_tier_prices.id IS
  'Primary key of the tier price.';
COMMENT ON COLUMN public.shelf_sku_tier_prices.sku_id IS
  'SKU this tier price belongs to.';
COMMENT ON COLUMN public.shelf_sku_tier_prices.created_at IS
  'Timestamp when the tier price was created.';
COMMENT ON COLUMN public.shelf_sku_tier_prices.updated_at IS
  'Timestamp when the tier price was last updated.';

COMMENT ON COLUMN public.shelf_sku_pattern_templates.id IS
  'Primary key of the pattern template.';
COMMENT ON COLUMN public.shelf_sku_pattern_templates.created_at IS
  'Timestamp when the template was created.';
COMMENT ON COLUMN public.shelf_sku_pattern_templates.updated_at IS
  'Timestamp when the template was last updated.';