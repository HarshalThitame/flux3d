CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_order_type TEXT NOT NULL CHECK (internal_order_type IN ('shop_order', 'custom_quote')),
  internal_order_id TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'payu')),
  payment_purpose TEXT NOT NULL CHECK (
    payment_purpose IN (
      'shop_order',
      'custom_quote_full_payment',
      'custom_quote_deposit',
      'custom_quote_balance'
    )
  ),
  provider_order_id TEXT,
  provider_payment_id TEXT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (
    status IN (
      'created',
      'pending',
      'authorized',
      'captured',
      'paid',
      'failed',
      'cancelled',
      'partially_refunded',
      'refunded',
      'disputed'
    )
  ),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  idempotency_key TEXT NOT NULL,
  receipt TEXT,
  failure_code TEXT,
  failure_description TEXT,
  payment_method TEXT,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_provider_order_id
  ON public.payment_attempts(provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_provider_payment_id
  ON public.payment_attempts(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_idempotency_key
  ON public.payment_attempts(idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_receipt
  ON public.payment_attempts(receipt)
  WHERE receipt IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_lookup
  ON public.payment_attempts(internal_order_type, internal_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_customer_lookup
  ON public.payment_attempts(customer_id, created_at DESC);

CREATE TRIGGER set_payment_attempts_updated_at
  BEFORE UPDATE ON public.payment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'payu')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_order_id TEXT,
  provider_payment_id TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (
    processing_status IN ('received', 'processing', 'processed', 'ignored', 'failed')
  ),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  sanitized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_event_id
  ON public.payment_events(provider, provider_event_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_order_id
  ON public.payment_events(provider, provider_order_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_processing_status
  ON public.payment_events(processing_status, received_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_attempt_id UUID NOT NULL REFERENCES public.payment_attempts(id) ON DELETE CASCADE,
  provider_refund_id TEXT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'processed', 'failed', 'cancelled')),
  reason TEXT NOT NULL,
  speed TEXT,
  initiated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refunds_provider_refund_id
  ON public.payment_refunds(provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_attempt_id
  ON public.payment_refunds(payment_attempt_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  request_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_entity
  ON public.payment_audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_actor
  ON public.payment_audit_logs(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_range_start DATE,
  date_range_end DATE,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  matched_count INTEGER NOT NULL DEFAULT 0,
  mismatch_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_status
  ON public.reconciliation_runs(status, started_at DESC);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_purpose TEXT DEFAULT 'custom_quote_full_payment',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN (
      'created',
      'pending',
      'authorized',
      'captured',
      'paid',
      'failed',
      'cancelled',
      'partially_refunded',
      'refunded',
      'disputed'
    )
  ),
  ADD COLUMN IF NOT EXISTS payment_attempt_id UUID,
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_refund_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_refund_amount_paise BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_purpose TEXT DEFAULT 'shop_order',
  ADD COLUMN IF NOT EXISTS payment_attempt_id UUID,
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payment_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_refund_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_refund_amount_paise BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.shelf_orders
  DROP CONSTRAINT IF EXISTS shelf_orders_payment_status_check;

ALTER TABLE public.shelf_orders
  ADD CONSTRAINT shelf_orders_payment_status_check CHECK (
    payment_status IN (
      'created',
      'pending',
      'authorized',
      'captured',
      'paid',
      'failed',
      'cancelled',
      'partially_refunded',
      'refunded',
      'disputed'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_order_id
  ON public.orders(provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_payment_id
  ON public.orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shelf_orders_provider_order_id
  ON public.shelf_orders(provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shelf_orders_provider_payment_id
  ON public.shelf_orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_attempts_select_own" ON public.payment_attempts;
CREATE POLICY "payment_attempts_select_own"
  ON public.payment_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "payment_attempts_service_role_full_access" ON public.payment_attempts;
CREATE POLICY "payment_attempts_service_role_full_access"
  ON public.payment_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "payment_events_service_role_full_access" ON public.payment_events;
CREATE POLICY "payment_events_service_role_full_access"
  ON public.payment_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "payment_refunds_service_role_full_access" ON public.payment_refunds;
CREATE POLICY "payment_refunds_service_role_full_access"
  ON public.payment_refunds
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "payment_audit_logs_service_role_full_access" ON public.payment_audit_logs;
CREATE POLICY "payment_audit_logs_service_role_full_access"
  ON public.payment_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "reconciliation_runs_service_role_full_access" ON public.reconciliation_runs;
CREATE POLICY "reconciliation_runs_service_role_full_access"
  ON public.reconciliation_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS payments_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS razorpay_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS razorpay_display_name TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_display_description TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_brand_color TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_method_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS razorpay_checkout_timeout_seconds INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS razorpay_refunds_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_timeout_seconds INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS payment_retry_message TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'razorpay';
