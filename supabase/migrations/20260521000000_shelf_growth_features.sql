CREATE TABLE public.shelf_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_shelf_wishlists_user_id
  ON public.shelf_wishlists(user_id);

CREATE INDEX idx_shelf_wishlists_product_id
  ON public.shelf_wishlists(product_id);

ALTER TABLE public.shelf_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shelf_wishlists_select_own"
  ON public.shelf_wishlists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shelf_wishlists_insert_own"
  ON public.shelf_wishlists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shelf_wishlists_delete_own"
  ON public.shelf_wishlists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shelf_wishlists_service_role_full_access"
  ON public.shelf_wishlists
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.shelf_notify_me (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  sku_id UUID REFERENCES public.shelf_skus(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, sku_id)
);

CREATE INDEX idx_shelf_notify_me_product_id
  ON public.shelf_notify_me(product_id);

CREATE INDEX idx_shelf_notify_me_sku_id
  ON public.shelf_notify_me(sku_id);

CREATE INDEX idx_shelf_notify_me_is_notified
  ON public.shelf_notify_me(is_notified);

ALTER TABLE public.shelf_notify_me ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shelf_notify_me_anyone_insert"
  ON public.shelf_notify_me
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "shelf_notify_me_service_role_full_access"
  ON public.shelf_notify_me
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
