-- Cart-time product price rules are intentionally separate from SKU generation
-- rules. They never mutate shelf_skus.price; the server resolves them at read
-- and checkout time, preserving the SKU catalog price as the audit baseline.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.shelf_product_cart_price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed_amount')),
  direction TEXT NOT NULL CHECK (direction IN ('increase', 'decrease')),
  adjustment_value NUMERIC(12,2) NOT NULL CHECK (adjustment_value > 0),
  min_unit_price NUMERIC(12,2) NOT NULL CHECK (min_unit_price >= 0),
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority >= 0 AND priority <= 100000),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_shelf_product_cart_price_rules_lookup
  ON public.shelf_product_cart_price_rules (product_id, is_active, priority DESC);

-- Equal-priority rules may never overlap. This makes a live price decision
-- deterministic even when rules are scheduled months in advance.
ALTER TABLE public.shelf_product_cart_price_rules
  ADD CONSTRAINT shelf_product_cart_price_rules_no_equal_priority_overlap
  EXCLUDE USING gist (
    product_id WITH =,
    priority WITH =,
    tstzrange(COALESCE(starts_at, '-infinity'), COALESCE(ends_at, 'infinity'), '[)') WITH &&
  ) WHERE (is_active);

DROP TRIGGER IF EXISTS set_shelf_product_cart_price_rules_updated_at
  ON public.shelf_product_cart_price_rules;
CREATE TRIGGER set_shelf_product_cart_price_rules_updated_at
  BEFORE UPDATE ON public.shelf_product_cart_price_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shelf_product_cart_price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart price rules are service-role managed"
  ON public.shelf_product_cart_price_rules
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Extend the immutable admin audit target taxonomy for price-rule events.
ALTER TABLE public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_target_type_check;
ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_target_type_check
  CHECK (target_type IN (
    'order', 'user', 'material', 'coupon', 'setting', 'payment', 'refund',
    'printer', 'quote', 'manufacturing', 'admin_user', 'whatsapp_knowledge',
    'link_request', 'product_cart_price_rule'
  ));
