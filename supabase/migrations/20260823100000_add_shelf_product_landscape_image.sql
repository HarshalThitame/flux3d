-- Landscape image for shelf_products: wide-format image used for social share
-- previews (Open Graph / Twitter cards) and landing page carousel backgrounds.
ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS landscape_image_url TEXT;

COMMENT ON COLUMN public.shelf_products.landscape_image_url IS
  'Wide landscape image used for social share previews and landing page carousel backgrounds.';