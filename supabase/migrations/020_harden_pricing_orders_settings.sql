-- Migration 020: complete pricing/order fields, settings, RLS hardening, and indexes.

ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS overhead_percent numeric(5,2) NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS material_markup_percent numeric(5,2) NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS print_speed_grams_per_hour numeric(10,2) NOT NULL DEFAULT 14.5,
ADD COLUMN IF NOT EXISTS post_processing_multipliers jsonb NOT NULL DEFAULT '{"none":0,"sanded":0.25,"sanded-painted":0.6}'::jsonb,
ADD COLUMN IF NOT EXISTS gst_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS cgst_percent numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_percent numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE business_settings
ALTER COLUMN margin_percentage SET DEFAULT 30;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS price_per_unit numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_processing_level text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS post_processing_charges numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS material_cost numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS machine_cost numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_percent numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_amount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS margin_percent numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS margin_amount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty_factor numeric(10,2) NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS cart_discount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cart_discount_percent numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS coupon_discount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS offer_discount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS offer_name text,
ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES offers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_code text,
ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_type text,
ADD COLUMN IF NOT EXISTS discount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;

UPDATE orders
SET
  subtotal = CASE
    WHEN subtotal = 0 THEN COALESCE(NULLIF(material_cost, 0), 0) + COALESCE(NULLIF(machine_cost, 0), 0) + COALESCE(NULLIF(post_processing_charges, 0), 0)
    ELSE subtotal
  END,
  discount = CASE
    WHEN discount = 0 THEN COALESCE(cart_discount, 0) + COALESCE(coupon_discount, 0) + COALESCE(offer_discount, 0)
    ELSE discount
  END,
  final_price = CASE
    WHEN final_price = 0 AND total_price > 0 THEN GREATEST(total_price - COALESCE(NULLIF(discount, 0), cart_discount + coupon_discount + offer_discount, 0), 0)
    ELSE final_price
  END,
  grand_total = CASE
    WHEN grand_total = 0 THEN COALESCE(NULLIF(final_price, 0), GREATEST(total_price - COALESCE(NULLIF(discount, 0), cart_discount + coupon_discount + offer_discount, 0), 0), total_price, 0) + COALESCE(delivery_charge, 0)
    ELSE grand_total
  END,
  price = CASE
    WHEN final_price > 0 THEN final_price
    WHEN total_price > 0 THEN GREATEST(total_price - COALESCE(NULLIF(discount, 0), cart_discount + coupon_discount + offer_discount, 0), 0)
    ELSE price
  END,
  price_per_unit = CASE
    WHEN price_per_unit = 0 AND quantity > 0 AND total_price > 0 THEN ROUND((total_price / quantity)::numeric, 2)
    ELSE price_per_unit
  END
WHERE total_price > 0
  AND (
    subtotal = 0
    OR discount = 0
    OR final_price = 0
    OR grand_total = 0
    OR price_per_unit = 0
  );

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_status_check;

UPDATE orders
SET status = CASE status
  WHEN 'reviewed' THEN 'confirmed'
  WHEN 'approved' THEN 'confirmed'
  WHEN 'queued' THEN 'confirmed'
  WHEN 'on-hold' THEN 'confirmed'
  WHEN 'rejected' THEN 'cancelled'
  ELSE status
END
WHERE status IN ('reviewed', 'approved', 'queued', 'on-hold', 'rejected');

ALTER TABLE orders
ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending',
    'confirmed',
    'printing',
    'shipped',
    'delivered',
    'completed',
    'cancelled'
  )
);

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (
  full_name,
  phone,
  address_line1,
  address_line2,
  city,
  state,
  pincode,
  landmark,
  notes,
  cancel_requested,
  updated_at
) ON public.orders TO authenticated;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON public.orders(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

CREATE OR REPLACE FUNCTION public.increment_coupon_used_count(coupon_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE coupons
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = coupon_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_offer_used_count(offer_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE offers
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = offer_id;
$$;
