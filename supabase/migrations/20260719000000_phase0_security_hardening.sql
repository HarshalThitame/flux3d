-- Phase 0 Security Hardening Migration
-- Run after all previous migrations.

-- ============================================================
-- 1. Admin permission columns
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_order_manager boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Quote versioning / approval workflow
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  calculated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('draft', 'pending_review', 'approved', 'accepted', 'expired', 'rejected')
  ),
  pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  material_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_versions_quote_id ON public.quote_versions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_versions_order_id ON public.quote_versions(order_id);
CREATE INDEX IF NOT EXISTS idx_quote_versions_user_id ON public.quote_versions(user_id);

CREATE TRIGGER set_quote_versions_updated_at
  BEFORE UPDATE ON public.quote_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Shipping rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shipping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT,
  pincode_range_start TEXT,
  pincode_range_end TEXT,
  minimum_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  maximum_weight_grams NUMERIC(10,2),
  charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  restricted BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_rules_lookup ON public.shipping_rules(state, pincode_range_start, pincode_range_end, is_active);

-- ============================================================
-- 4. Payment status history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_attempt_id UUID NOT NULL REFERENCES public.payment_attempts(id) ON DELETE CASCADE,
  internal_order_type TEXT,
  internal_order_id TEXT,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'system',
  reason TEXT NOT NULL,
  approved_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_status_history_attempt ON public.payment_status_history(payment_attempt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_status_history_order ON public.payment_status_history(internal_order_type, internal_order_id, created_at DESC);

-- ============================================================
-- 5. WhatsApp webhook events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT,
  payload_hash TEXT NOT NULL,
  sender TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  reply_sent BOOLEAN NOT NULL DEFAULT false,
  error TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_payload_hash
  ON public.whatsapp_webhook_events(payload_hash);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_sender ON public.whatsapp_webhook_events(sender);

-- ============================================================
-- 6. Order price snapshot on shelf orders
-- ============================================================
ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS order_price_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 7. Invoice tracking on orders
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;

ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;

-- ============================================================
-- 8. Expand order status to include approval workflow
-- ============================================================
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'pending_review',
      'approved',
      'confirmed',
      'printing',
      'shipped',
      'delivered',
      'completed',
      'cancelled'
    )
  );

-- ============================================================
-- 10. RLS on new tables
-- ============================================================
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can see their own quote versions
DROP POLICY IF EXISTS "quote_versions_select_own" ON public.quote_versions;
CREATE POLICY "quote_versions_select_own" ON public.quote_versions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Service role manages quote versions
DROP POLICY IF EXISTS "quote_versions_service_role_full_access" ON public.quote_versions;
CREATE POLICY "quote_versions_service_role_full_access" ON public.quote_versions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Shipping rules are public read
DROP POLICY IF EXISTS "shipping_rules_public_read" ON public.shipping_rules;
CREATE POLICY "shipping_rules_public_read" ON public.shipping_rules
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Service role manages shipping rules
DROP POLICY IF EXISTS "shipping_rules_service_role_full_access" ON public.shipping_rules;
CREATE POLICY "shipping_rules_service_role_full_access" ON public.shipping_rules
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Payment status history is readable by service role and own customer
DROP POLICY IF EXISTS "payment_status_history_select_own" ON public.payment_status_history;
CREATE POLICY "payment_status_history_select_own" ON public.payment_status_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.payment_attempts
    WHERE payment_attempts.id = payment_status_history.payment_attempt_id
      AND payment_attempts.customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "payment_status_history_service_role_full_access" ON public.payment_status_history;
CREATE POLICY "payment_status_history_service_role_full_access" ON public.payment_status_history
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- WhatsApp webhook events are service role only
DROP POLICY IF EXISTS "whatsapp_webhook_events_service_role_full_access" ON public.whatsapp_webhook_events;
CREATE POLICY "whatsapp_webhook_events_service_role_full_access" ON public.whatsapp_webhook_events
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 11. Additional indexes for security/performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_shelf_orders_payment_status ON public.shelf_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_shelf_orders_user_payment ON public.shelf_orders(user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON public.payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quote_versions_status ON public.quote_versions(status);
