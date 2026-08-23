-- ---------------------------------------------------------------------------
-- Server-synced carts
--
-- Reuses public.cart_items (previously abandoned-cart analytics only) as the
-- source of truth for shopper carts across devices.
--   cart_type 'quote'  -> instant-quote cart (existing shape)
--   cart_type 'shop'   -> 3D Shop cart (sku reference lines)
-- Money fields (estimated_cost / payload prices) are display snapshots only;
-- live pricing is always resolved at load/checkout time.
-- ---------------------------------------------------------------------------

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS cart_type TEXT NOT NULL DEFAULT 'quote',
  ADD COLUMN IF NOT EXISTS sku_id UUID,
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_cart_type_check'
  ) THEN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_items_cart_type_check CHECK (cart_type IN ('shop', 'quote'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cart_items_user_type_active
  ON public.cart_items (user_id, cart_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_cart_items_sku_id ON public.cart_items (sku_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items (product_id);

DROP TRIGGER IF EXISTS set_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Row-level security: owners get full access to their own cart lines through
-- the Data API; the existing service_role policy keeps admin/analytics access.
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_items_owner_all" ON public.cart_items;
CREATE POLICY "cart_items_owner_all"
  ON public.cart_items
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
