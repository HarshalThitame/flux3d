-- Add image_alt JSONB column to shelf_products for per-image alt text (SEO/accessibility).
-- Maps image URL -> alt text. Includes the thumbnail and all gallery image URLs.
ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS image_alt JSONB NOT NULL DEFAULT '{}'::jsonb;
