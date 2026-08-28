-- ============================================================================
-- Luxury Variant & SKU System (AETHER)
-- Phase 1: Database foundation for the enterprise-grade variant builder,
-- pattern-based SKU generation, pricing rules, tiered pricing and QR/barcode.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. shelf_variant_options: per-value rich metadata
--    value_metadata maps value -> { swatch_image_url, hex_color, description,
--    price_modifier, slug }. Backward compatible with values TEXT[].
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_variant_options
  ADD COLUMN IF NOT EXISTS value_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN public.shelf_variant_options.value_metadata IS
  'Per-value metadata keyed by value string: swatch_image_url, hex_color, description, price_modifier, slug.';

-- ---------------------------------------------------------------------------
-- 2. shelf_products: per-product SKU code pattern
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS sku_pattern TEXT;

COMMENT ON COLUMN public.shelf_products.sku_pattern IS
  'SKU code pattern with tokens like {SLUG}, {COLOR}, {SIZE}, {MATERIAL}, {FINISH}, {STYLE}. Overrides category template.';

-- ---------------------------------------------------------------------------
-- 3. shelf_skus: cost / status / barcode / QR
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_skus
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS status TEXT
    CHECK (status IS NULL OR status IN (
      'in_stock','low_stock','out_of_stock','unavailable',
      'made_to_order','limited_edition','discontinued'
    )),
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS qr_url TEXT;

COMMENT ON COLUMN public.shelf_skus.cost_price IS 'Cost price used for margin calculation (margin% = (price-cost)/price).';
COMMENT ON COLUMN public.shelf_skus.status IS 'Optional editorial status override for luxury badges; NULL means derived from stock.';
COMMENT ON COLUMN public.shelf_skus.barcode IS 'Scannable barcode value for packaging / POS.';
COMMENT ON COLUMN public.shelf_skus.qr_url IS 'Scannable QR code image URL for packaging / catalog.';

CREATE INDEX IF NOT EXISTS idx_shelf_skus_status ON public.shelf_skus (status)
  WHERE status IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. shelf_sku_pricing_rules: enterprise rule engine
--    Highest priority rule wins (per unique conditions match).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shelf_sku_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'fixed_add','percent_add','fixed_override','multiply'
  )),
  conditions JSONB NOT NULL DEFAULT '{}',
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shelf_sku_pricing_rules_product
  ON public.shelf_sku_pricing_rules (product_id);

COMMENT ON TABLE public.shelf_sku_pricing_rules IS
  'Enterprise pricing rules applied during SKU generation. Each rule matches a set of variant value conditions. The highest-priority matching rule determines that SKU price.';

DROP TRIGGER IF EXISTS set_shelf_sku_pricing_rules_updated_at
  ON public.shelf_sku_pricing_rules;
CREATE TRIGGER set_shelf_sku_pricing_rules_updated_at
  BEFORE UPDATE ON public.shelf_sku_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. shelf_sku_tier_prices: enterprise tiered pricing
--    Tiers: Retail (base price), Member, VIP, Wholesale.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shelf_sku_tier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES public.shelf_skus(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL CHECK (tier_name IN ('Member','VIP','Wholesale')),
  price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sku_id, tier_name)
);

CREATE INDEX IF NOT EXISTS idx_shelf_sku_tier_prices_sku
  ON public.shelf_sku_tier_prices (sku_id);

COMMENT ON TABLE public.shelf_sku_tier_prices IS
  'Per-SKU tiered prices (Retail lives on shelf_skus.price; Member/VIP/Wholesale overrides live here).';

-- ---------------------------------------------------------------------------
-- 6. shelf_sku_pattern_templates: reusable pattern templates per category
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shelf_sku_pattern_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  category_id UUID REFERENCES public.shelf_categories(id) ON DELETE SET NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.shelf_sku_pattern_templates IS
  'Reusable SKU code pattern templates (e.g. "{SLUG}-{COLOR}-{SIZE}") that can be scoped to a category.';

-- ---------------------------------------------------------------------------
-- Row Level Security: public read + service_role write (matches existing shelf)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shelf_sku_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_sku_tier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_sku_pattern_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shelf_sku_pricing_rules_public_read" ON public.shelf_sku_pricing_rules;
CREATE POLICY "shelf_sku_pricing_rules_public_read"
  ON public.shelf_sku_pricing_rules
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "shelf_sku_pricing_rules_service_role_write" ON public.shelf_sku_pricing_rules;
CREATE POLICY "shelf_sku_pricing_rules_service_role_write"
  ON public.shelf_sku_pricing_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "shelf_sku_tier_prices_public_read" ON public.shelf_sku_tier_prices;
CREATE POLICY "shelf_sku_tier_prices_public_read"
  ON public.shelf_sku_tier_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "shelf_sku_tier_prices_service_role_write" ON public.shelf_sku_tier_prices;
CREATE POLICY "shelf_sku_tier_prices_service_role_write"
  ON public.shelf_sku_tier_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "shelf_sku_pattern_templates_public_read" ON public.shelf_sku_pattern_templates;
CREATE POLICY "shelf_sku_pattern_templates_public_read"
  ON public.shelf_sku_pattern_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "shelf_sku_pattern_templates_service_role_write" ON public.shelf_sku_pattern_templates;
CREATE POLICY "shelf_sku_pattern_templates_service_role_write"
  ON public.shelf_sku_pattern_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Seed default pattern templates
-- ---------------------------------------------------------------------------
INSERT INTO public.shelf_sku_pattern_templates (name, pattern, is_default)
VALUES
  ('Premium Classic', '{SLUG}-{COLOR}-{SIZE}', true),
  ('Material First', '{SLUG}-{MATERIAL}-{FINISH}', false),
  ('Full Spec', '{SLUG}-{MATERIAL}-{COLOR}-{SIZE}', false),
  ('Monogram Luxury', '{SLUG}-{INITIALS}', false)
ON CONFLICT DO NOTHING;