CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.shelf_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_emoji TEXT,
  banner_image_url TEXT,
  parent_category_id UUID REFERENCES public.shelf_categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shelf_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  category_id UUID REFERENCES public.shelf_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  occasion_tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_customizable BOOLEAN DEFAULT false,
  customization_label TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shelf_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('swatch_color','button','dropdown','toggle','text_input')),
  values TEXT[] DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shelf_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL UNIQUE,
  variant_combination JSONB NOT NULL DEFAULT '{}',
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  weight_grams NUMERIC(8,2),
  variant_image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  pre_order_eta DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shelf_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  coupon_code TEXT,
  shipping_charge NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_address JSONB NOT NULL DEFAULT '{}',
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_id TEXT,
  order_status TEXT NOT NULL DEFAULT 'placed' CHECK (order_status IN ('placed','confirmed','packed','shipped','delivered','cancelled','return_requested','returned')),
  tracking_number TEXT,
  courier_name TEXT,
  tracking_url TEXT,
  estimated_delivery DATE,
  order_source TEXT NOT NULL DEFAULT 'shop',
  admin_notes TEXT,
  cancellation_reason TEXT,
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.shelf_orders.items IS
  'Array of item snapshots: product_id, product_name, product_thumbnail, sku_id, sku_code, variant_combination, quantity, unit_price, customization_text.';

COMMENT ON COLUMN public.shelf_orders.shipping_address IS
  'Shipping address snapshot: name, phone, line1, line2, city, state, pincode.';

CREATE TABLE public.shelf_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.shelf_orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  image_urls TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, order_id, product_id)
);

CREATE TABLE public.shelf_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('flat','percent')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shelf_categories_parent_category_id
  ON public.shelf_categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_shelf_products_category_id
  ON public.shelf_products(category_id);

CREATE INDEX IF NOT EXISTS idx_shelf_products_is_active
  ON public.shelf_products(is_active);

CREATE INDEX IF NOT EXISTS idx_shelf_products_is_featured
  ON public.shelf_products(is_featured);

CREATE INDEX IF NOT EXISTS idx_shelf_variant_options_product_id
  ON public.shelf_variant_options(product_id);

CREATE INDEX IF NOT EXISTS idx_shelf_skus_product_id
  ON public.shelf_skus(product_id);

CREATE INDEX IF NOT EXISTS idx_shelf_skus_is_available
  ON public.shelf_skus(is_available);

CREATE INDEX IF NOT EXISTS idx_shelf_orders_user_id
  ON public.shelf_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_shelf_orders_order_status
  ON public.shelf_orders(order_status);

CREATE INDEX IF NOT EXISTS idx_shelf_orders_placed_at
  ON public.shelf_orders(placed_at);

CREATE INDEX IF NOT EXISTS idx_shelf_reviews_product_id
  ON public.shelf_reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_shelf_reviews_user_id
  ON public.shelf_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_shelf_reviews_order_id
  ON public.shelf_reviews(order_id);

CREATE INDEX IF NOT EXISTS idx_shelf_reviews_is_approved
  ON public.shelf_reviews(is_approved);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shelf_products_updated_at
  BEFORE UPDATE ON public.shelf_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_shelf_skus_updated_at
  BEFORE UPDATE ON public.shelf_skus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_shelf_orders_updated_at
  BEFORE UPDATE ON public.shelf_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shelf_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shelf_categories_public_read"
  ON public.shelf_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_categories_service_role_write"
  ON public.shelf_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_products_public_read"
  ON public.shelf_products
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_products_service_role_write"
  ON public.shelf_products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_variant_options_public_read"
  ON public.shelf_variant_options
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_variant_options_service_role_write"
  ON public.shelf_variant_options
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_skus_public_read"
  ON public.shelf_skus
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_skus_service_role_write"
  ON public.shelf_skus
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_orders_select_own"
  ON public.shelf_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shelf_orders_service_role_full_access"
  ON public.shelf_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_reviews_public_read"
  ON public.shelf_reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_reviews_insert_own"
  ON public.shelf_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shelf_reviews_service_role_full_access"
  ON public.shelf_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shelf_coupons_service_role_full_access"
  ON public.shelf_coupons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
