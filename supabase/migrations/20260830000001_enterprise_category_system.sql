-- Create junction table for many-to-many category relationships
CREATE TABLE IF NOT EXISTS public.shelf_product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.shelf_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, category_id)
);

-- Add indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_shelf_product_categories_product_id 
  ON public.shelf_product_categories(product_id);

CREATE INDEX IF NOT EXISTS idx_shelf_product_categories_category_id 
  ON public.shelf_product_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_shelf_product_categories_is_primary 
  ON public.shelf_product_categories(product_id) 
  WHERE is_primary = true;

-- Enable Row Level Security
ALTER TABLE public.shelf_product_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "shelf_product_categories_public_read"
  ON public.shelf_product_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_product_categories_service_role_write"
  ON public.shelf_product_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- BACKFILL EXISTING DATA: Migrate one-to-many into many-to-many
-- Assign the existing category_id as the primary category in the junction table
INSERT INTO public.shelf_product_categories (product_id, category_id, is_primary)
SELECT id, category_id, true
FROM public.shelf_products
WHERE category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO UPDATE 
SET is_primary = true;

-- We intentionally DO NOT drop shelf_products.category_id yet. 
-- It remains as a fallback until the application code is fully migrated and tested.
