ALTER TABLE public.shelf_products
ADD COLUMN IF NOT EXISTS long_description_blocks JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_shelf_products_blocks
  ON public.shelf_products USING GIN (long_description_blocks);