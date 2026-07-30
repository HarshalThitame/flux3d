ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS meta_item_id text,
  ADD COLUMN IF NOT EXISTS meta_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta_sync_error text;

CREATE INDEX IF NOT EXISTS idx_shelf_products_meta_synced_at ON public.shelf_products (meta_synced_at) WHERE meta_item_id IS NOT NULL;
