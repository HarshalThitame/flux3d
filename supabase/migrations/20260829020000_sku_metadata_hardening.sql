-- ============================================================================
-- AETHER luxury variant & SKU system — metadata hardening
-- * Index pattern templates for category / default lookups
-- * Add updated_at audit columns + triggers to tier_prices & pattern_templates
-- * Column-level documentation for the three new tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Performance indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_shelf_sku_pattern_templates_category
  ON public.shelf_sku_pattern_templates (category_id);

CREATE INDEX IF NOT EXISTS idx_shelf_sku_pattern_templates_default
  ON public.shelf_sku_pattern_templates (is_default)
  WHERE is_default = true;

-- ---------------------------------------------------------------------------
-- 2. updated_at audit columns + triggers
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_sku_tier_prices
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS set_shelf_sku_tier_prices_updated_at
  ON public.shelf_sku_tier_prices;
CREATE TRIGGER set_shelf_sku_tier_prices_updated_at
  BEFORE UPDATE ON public.shelf_sku_tier_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shelf_sku_pattern_templates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS set_shelf_sku_pattern_templates_updated_at
  ON public.shelf_sku_pattern_templates;
CREATE TRIGGER set_shelf_sku_pattern_templates_updated_at
  BEFORE UPDATE ON public.shelf_sku_pattern_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. Column-level documentation
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.shelf_sku_pricing_rules.name IS
  'Human-readable pricing rule name.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.rule_type IS
  'Modifier applied when the rule matches: fixed_add, percent_add, fixed_override or multiply.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.conditions IS
  'Variant value conditions (option name -> values) that gate this rule.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.value IS
  'Numeric modifier value used by the rule type.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.priority IS
  'Higher priority wins when multiple rules match a combination.';
COMMENT ON COLUMN public.shelf_sku_pricing_rules.is_active IS
  'Soft toggle to enable or disable the rule.';

COMMENT ON COLUMN public.shelf_sku_tier_prices.tier_name IS
  'Enterprise tier: Member, VIP or Wholesale.';
COMMENT ON COLUMN public.shelf_sku_tier_prices.price IS
  'Tier price override. Retail price lives on shelf_skus.price.';

COMMENT ON COLUMN public.shelf_sku_pattern_templates.name IS
  'Reusable SKU pattern template name.';
COMMENT ON COLUMN public.shelf_sku_pattern_templates.pattern IS
  'SKU code pattern with tokens like {SLUG}, {COLOR}, {SIZE}, {MATERIAL}.';
COMMENT ON COLUMN public.shelf_sku_pattern_templates.category_id IS
  'Optional category scope; NULL means the template applies globally.';
COMMENT ON COLUMN public.shelf_sku_pattern_templates.is_default IS
  'Whether this template is the default for its scope.';