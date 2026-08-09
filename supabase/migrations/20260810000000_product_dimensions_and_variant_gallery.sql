-- ============================================================================
-- Product Dimensions + Variant / SKU Image Galleries
-- Enterprise-grade physical dimensions (metric + imperial display) and
-- multi-image support per variant option value and per SKU.
-- ============================================================================

-- 1. Product-level fallback/default dimensions (JSONB, mm/g base units)
ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS default_dimensions JSONB;

COMMENT ON COLUMN public.shelf_products.default_dimensions IS
  'Fallback dimensions JSONB: { length_mm, width_mm, height_mm, weight_g, volume_cc, dimension_unit, weight_unit }.';

-- 2. Per variant option value dimensions (e.g. "Size: Large")
CREATE TABLE IF NOT EXISTS public.shelf_variant_option_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_value TEXT NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, option_name, option_value)
);

COMMENT ON COLUMN public.shelf_variant_option_dimensions.dimensions IS
  'Dimensions JSONB for a specific option value: { length_mm, width_mm, height_mm, weight_g, volume_cc, dimension_unit, weight_unit }.';

-- 3. Gallery images per variant option value (e.g. "Color: Red")
CREATE TABLE IF NOT EXISTS public.shelf_variant_option_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_value TEXT NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Gallery images per SKU (specific variant combination)
CREATE TABLE IF NOT EXISTS public.shelf_sku_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES public.shelf_skus(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_variant_option_dimensions_product
  ON public.shelf_variant_option_dimensions(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_option_images_product
  ON public.shelf_variant_option_images(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_option_images_option
  ON public.shelf_variant_option_images(product_id, option_name, option_value);
CREATE INDEX IF NOT EXISTS idx_sku_images_sku_id
  ON public.shelf_sku_images(sku_id);

-- updated_at trigger for dimensions rows
CREATE TRIGGER set_shelf_variant_option_dimensions_updated_at
  BEFORE UPDATE ON public.shelf_variant_option_dimensions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing single variant images into the new gallery table
INSERT INTO public.shelf_sku_images (sku_id, image_url, alt_text, display_order, is_primary)
SELECT id, variant_image_url, NULL, 0, true
FROM public.shelf_skus
WHERE variant_image_url IS NOT NULL AND variant_image_url <> '';

-- Row Level Security
ALTER TABLE public.shelf_variant_option_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_variant_option_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_sku_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shelf_variant_option_dimensions_public_read"
  ON public.shelf_variant_option_dimensions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_variant_option_dimensions_service_role_write"
  ON public.shelf_variant_option_dimensions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_variant_option_images_public_read"
  ON public.shelf_variant_option_images
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_variant_option_images_service_role_write"
  ON public.shelf_variant_option_images
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_sku_images_public_read"
  ON public.shelf_sku_images
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_sku_images_service_role_write"
  ON public.shelf_sku_images
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);