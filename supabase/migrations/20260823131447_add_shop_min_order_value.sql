-- Shop-wide minimum order value for 3D Shop delivery
-- Applied at checkout/pincode check when a shipping_rules row does not set its own
-- minimum_order_value. 0 = disabled (no global minimum).
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS shop_min_order_value numeric(10,2) NOT NULL DEFAULT 0;
