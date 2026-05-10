-- Migration 013: Create Offers, Coupons & Redemptions system

-- ============================================================
-- OFFERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS offers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  banner_url    TEXT,
  offer_type    TEXT NOT NULL CHECK (offer_type IN ('percentage','fixed_amount','free_shipping','buy_x_get_y'))
                DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount  NUMERIC(10,2),          -- max discount cap (for percentage type)
  min_order_value NUMERIC(10,2) DEFAULT 0,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_featured   BOOLEAN NOT NULL DEFAULT false,  -- show on homepage hero/banner
  coupon_code   TEXT UNIQUE,             -- if tied to a specific coupon
  applicable_categories TEXT[],          -- category names
  applicable_materials TEXT[],           -- material IDs
  applicable_products  TEXT[],           -- product IDs (if any)
  usage_limit   INTEGER DEFAULT NULL,    -- max total uses
  usage_per_user INTEGER DEFAULT NULL,   -- max uses per user
  used_count    INTEGER NOT NULL DEFAULT 0,
  badge_text    TEXT,                    -- e.g. "Diwali Sale", "Flash Sale"
  badge_color   TEXT DEFAULT 'from-[#7C5CFF] to-[#A78BFA]',
  sale_label    TEXT,                    -- e.g. "15% Off", "₹200 Off"
  theme_config  JSONB DEFAULT '{}',      -- festival theme colors/overrides
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_active_dates ON offers (is_active, starts_at, ends_at);
CREATE INDEX idx_offers_coupon_code ON offers (coupon_code) WHERE coupon_code IS NOT NULL;

-- ============================================================
-- COUPONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed_amount','free_shipping'))
                  DEFAULT 'percentage',
  discount_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount    NUMERIC(10,2),
  min_order_value NUMERIC(10,2) DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  usage_limit     INTEGER DEFAULT NULL,
  usage_per_user  INTEGER DEFAULT NULL,
  used_count      INTEGER NOT NULL DEFAULT 0,
  applicable_categories TEXT[],
  applicable_materials  TEXT[],
  applicable_products   TEXT[],
  first_order_only BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON coupons (code);
CREATE INDEX idx_coupons_active_dates ON coupons (is_active, starts_at, expires_at);

-- ============================================================
-- OFFER / COUPON REDEMPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id      TEXT,                    -- order_number or order id
  offer_id      UUID REFERENCES offers(id) ON DELETE SET NULL,
  coupon_id     UUID REFERENCES coupons(id) ON DELETE SET NULL,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  discount_applied NUMERIC(10,2) NOT NULL,
  order_amount  NUMERIC(10,2) NOT NULL,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_redemptions_user ON redemptions (user_id);
CREATE INDEX idx_redemptions_offer ON redemptions (offer_id);
CREATE INDEX idx_redemptions_coupon ON redemptions (coupon_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Public can read active offers (for homepage display)
CREATE POLICY "Public can read active offers"
  ON offers FOR SELECT
  USING (is_active = true AND starts_at <= now() AND ends_at >= now());

-- Admin (service_role) has full access
-- (default deny for all others)

-- Public can read active coupons (for validation)
CREATE POLICY "Public can read active coupons"
  ON coupons FOR SELECT
  USING (is_active = true AND starts_at <= now() AND expires_at >= now());

-- Users can read their own redemptions
CREATE POLICY "Users can read own redemptions"
  ON redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own redemptions
CREATE POLICY "Users can insert own redemptions"
  ON redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ADD DISCOUNT COLUMNS TO ORDERS TABLE
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type TEXT; -- 'percentage' | 'fixed_amount' | 'free_shipping'
