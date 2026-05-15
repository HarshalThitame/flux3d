ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS cart_discount_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS cart_discount_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cart_discount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cart_discount_percent numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_percent numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_amount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS margin_percent numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS margin_amount numeric(10,2) NOT NULL DEFAULT 0;
