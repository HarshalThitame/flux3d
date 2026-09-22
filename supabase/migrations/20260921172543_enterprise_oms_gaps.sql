-- Enterprise OMS Gap Migration
-- Fills missing tables and columns from the Phase 1-4 schema

-- ─────────────────────────────────────────────────────────────────
-- 1. oms_orders — Add missing lifecycle timestamps & metadata cols
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.oms_orders
  ADD COLUMN IF NOT EXISTS source_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS production_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS production_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS on_hold_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL DEFAULT 0;

-- Expand status enum values via CHECK constraint replacement
ALTER TABLE public.oms_orders DROP CONSTRAINT IF EXISTS oms_orders_status_check;
ALTER TABLE public.oms_orders DROP CONSTRAINT IF EXISTS oms_orders_payment_status_check;
ALTER TABLE public.oms_orders DROP CONSTRAINT IF EXISTS oms_orders_fulfillment_status_check;

ALTER TABLE public.oms_orders
  ADD CONSTRAINT oms_orders_status_check CHECK (status IN (
    'DRAFT','CONFIRMED','PAYMENT_PENDING','PAYMENT_RECEIVED',
    'IN_PRODUCTION','QUALITY_CHECK','PACKED','SHIPPED',
    'OUT_FOR_DELIVERY','DELIVERED','CANCELLED','ON_HOLD',
    'PAYMENT_FAILED','PRINT_FAILED','RETURN_REQUESTED','RETURNED','REFUNDED'
  )),
  ADD CONSTRAINT oms_orders_payment_status_check CHECK (payment_status IN (
    'UNPAID','PARTIALLY_PAID','PAID','REFUNDED','PARTIALLY_REFUNDED','FAILED'
  )),
  ADD CONSTRAINT oms_orders_fulfillment_status_check CHECK (fulfillment_status IN (
    'NOT_SHIPPED','IN_PRODUCTION','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','RETURNED'
  ));

-- ─────────────────────────────────────────────────────────────────
-- 2. oms_order_items — discount per line item
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.oms_order_items
  ADD COLUMN IF NOT EXISTS discount DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax DECIMAL DEFAULT 0;

-- Redefine subtotal to account for discount (drop generated column, re-add)
ALTER TABLE public.oms_order_items DROP COLUMN IF EXISTS subtotal;
ALTER TABLE public.oms_order_items
  ADD COLUMN subtotal DECIMAL GENERATED ALWAYS AS (
    (quantity * unit_price) - COALESCE(discount, 0)
  ) STORED;

-- ─────────────────────────────────────────────────────────────────
-- 3. oms_shipments — landmark & shipping_required flag
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.oms_shipments
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS shipping_required BOOLEAN DEFAULT true;

-- ─────────────────────────────────────────────────────────────────
-- 4. customers — add customer_notes and user link
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- ─────────────────────────────────────────────────────────────────
-- 5. oms_payment_transactions — append-only payment ledger
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oms_payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.oms_orders(id) ON DELETE CASCADE,

  amount DECIMAL NOT NULL,
  payment_method TEXT NOT NULL, -- 'upi' | 'cash' | 'bank_transfer' | 'razorpay' | 'card' | 'whatsapp_payment' | 'cod' | 'other'
  payment_status TEXT NOT NULL DEFAULT 'received', -- 'received' | 'pending' | 'failed' | 'refunded'

  reference_id TEXT,       -- UPI ref, Razorpay payment ID, cheque number, etc.
  notes TEXT,

  recorded_by UUID,        -- auth.users.id of admin who recorded it
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.oms_payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_oms_payment_transactions"
  ON public.oms_payment_transactions FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "service_all_oms_payment_transactions"
  ON public.oms_payment_transactions
  TO service_role USING (true) WITH CHECK (true);

-- Trigger: after insert/update on payment_transactions, recalculate oms_orders.amount_paid
CREATE OR REPLACE FUNCTION sync_oms_order_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE public.oms_orders
  SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.oms_payment_transactions
    WHERE order_id = v_order_id
      AND payment_status = 'received'
  )
  WHERE id = v_order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE TRIGGER trigger_sync_oms_order_amount_paid
AFTER INSERT OR UPDATE OR DELETE ON public.oms_payment_transactions
FOR EACH ROW EXECUTE FUNCTION sync_oms_order_amount_paid();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oms_payment_transactions_order_id ON public.oms_payment_transactions(order_id);

-- ─────────────────────────────────────────────────────────────────
-- 6. oms_communications — unified comm timeline
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oms_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.oms_orders(id) ON DELETE CASCADE,

  channel TEXT NOT NULL, -- 'whatsapp' | 'email' | 'phone' | 'sms' | 'note' | 'system'
  direction TEXT NOT NULL DEFAULT 'outbound', -- 'inbound' | 'outbound' | 'internal'
  subject TEXT,
  body TEXT NOT NULL,

  sent_by UUID,           -- auth.users.id; NULL = system/automated
  communicated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.oms_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_oms_communications"
  ON public.oms_communications FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "service_all_oms_communications"
  ON public.oms_communications
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_oms_communications_order_id ON public.oms_communications(order_id);

-- ─────────────────────────────────────────────────────────────────
-- 7. oms_orders — indexes
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_oms_orders_customer_id ON public.oms_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_oms_orders_status ON public.oms_orders(status);
CREATE INDEX IF NOT EXISTS idx_oms_orders_order_date ON public.oms_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_oms_orders_order_number ON public.oms_orders(order_number);

-- ─────────────────────────────────────────────────────────────────
-- 8. oms_audit_logs — add actor name for display
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.oms_audit_logs
  ADD COLUMN IF NOT EXISTS actor_name TEXT; -- stored snapshot so logs survive user deletion

-- ─────────────────────────────────────────────────────────────────
-- 9. GRANT table access to authenticated & anon (Data API exposure)
-- ─────────────────────────────────────────────────────────────────
GRANT SELECT ON public.oms_payment_transactions TO authenticated;
GRANT SELECT ON public.oms_communications TO authenticated;
GRANT ALL ON public.oms_payment_transactions TO service_role;
GRANT ALL ON public.oms_communications TO service_role;
