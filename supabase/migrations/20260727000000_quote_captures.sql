-- ============================================================
-- Quote Captures Table
-- Defers order creation until payment is verified.
-- Captures hold the full quote draft + address + config data
-- until the payment clears, at which point the real order is created.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quote_captures (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference         TEXT        NOT NULL UNIQUE,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
  amount_paise      BIGINT      NOT NULL CHECK (amount_paise > 0),
  currency          TEXT        NOT NULL DEFAULT 'INR',

  -- Full quote data stored as JSONB (complete immutable snapshot)
  draft_data        JSONB       NOT NULL,
  address_data      JSONB       NOT NULL,
  config_data       JSONB       NOT NULL,
  pricing_data      JSONB       NOT NULL,
  model_metadata    JSONB       NOT NULL,

  -- Payment linkage (filled after payment)
  razorpay_order_id     TEXT,
  payment_attempt_id    UUID REFERENCES public.payment_attempts(id) ON DELETE SET NULL,
  order_id              UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  paid_at       TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_quote_captures_user_id     ON public.quote_captures(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_captures_status      ON public.quote_captures(status);
CREATE INDEX IF NOT EXISTS idx_quote_captures_reference   ON public.quote_captures(reference);
CREATE INDEX IF NOT EXISTS idx_quote_captures_expires_at  ON public.quote_captures(expires_at)
  WHERE status = 'pending';

-- ============================================================
-- RLS: users can read their own captures; service_role full access
-- ============================================================
ALTER TABLE public.quote_captures ENABLE ROW LEVEL SECURITY;

-- Authenticated users can SELECT their own captures
DROP POLICY IF EXISTS "qc_select_own" ON public.quote_captures;
CREATE POLICY "qc_select_own" ON public.quote_captures
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role can do everything
DROP POLICY IF EXISTS "qc_service_role_insert" ON public.quote_captures;
CREATE POLICY "qc_service_role_insert" ON public.quote_captures
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "qc_service_role_select" ON public.quote_captures;
CREATE POLICY "qc_service_role_select" ON public.quote_captures
  FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "qc_service_role_update" ON public.quote_captures;
CREATE POLICY "qc_service_role_update" ON public.quote_captures
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Auto-update updated_at on row modification
-- ============================================================
CREATE OR REPLACE FUNCTION update_quote_captures_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_captures_updated_at ON public.quote_captures;
CREATE TRIGGER trg_quote_captures_updated_at
  BEFORE UPDATE ON public.quote_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_captures_updated_at();
