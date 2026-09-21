-- Phase 1: Core OMS & Entity Unification

-- 1. Customers Table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  customer_type TEXT DEFAULT 'individual', -- 'individual' | 'business'
  company_name TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.customers TO service_role USING (true) WITH CHECK (true);

-- 2. Unified Orders Table
CREATE SEQUENCE IF NOT EXISTS oms_order_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.oms_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('FXD-2026-' || LPAD(nextval('oms_order_number_seq')::TEXT, 6, '0')),
  customer_id UUID REFERENCES public.customers(id),
  source TEXT NOT NULL, -- 'website' | 'whatsapp' | 'instagram' | 'phone' | 'walk-in'
  
  -- State Machine
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT | CONFIRMED | IN_PRODUCTION | PACKED | SHIPPED | DELIVERED
  payment_status TEXT NOT NULL DEFAULT 'UNPAID', -- UNPAID | PARTIALLY_PAID | PAID | REFUNDED
  fulfillment_status TEXT NOT NULL DEFAULT 'NOT_SHIPPED', 
  
  -- Pricing Engine
  subtotal DECIMAL DEFAULT 0,
  discount DECIMAL DEFAULT 0,
  shipping_cost DECIMAL DEFAULT 0,
  tax DECIMAL DEFAULT 0,
  total_amount DECIMAL DEFAULT 0,
  amount_paid DECIMAL DEFAULT 0,
  amount_due DECIMAL GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  -- Core Timestamps
  order_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  
  -- Soft Delete
  archived_at TIMESTAMPTZ
);

-- RLS for OMS Orders
ALTER TABLE public.oms_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_orders TO service_role USING (true) WITH CHECK (true);

-- 3. OMS Order Items Table
CREATE TABLE IF NOT EXISTS public.oms_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.oms_orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL NOT NULL DEFAULT 0,
  subtotal DECIMAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  custom_attributes JSONB -- Stores 3D specific data: material, color, infill, weight, etc.
);

-- RLS for OMS Order Items
ALTER TABLE public.oms_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_order_items TO service_role USING (true) WITH CHECK (true);

-- Trigger to calculate total_amount on oms_orders when oms_order_items changes
CREATE OR REPLACE FUNCTION update_oms_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.oms_orders
  SET 
    subtotal = (SELECT COALESCE(SUM(subtotal), 0) FROM public.oms_order_items WHERE order_id = NEW.order_id),
    total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM public.oms_order_items WHERE order_id = NEW.order_id) + COALESCE(shipping_cost, 0) + COALESCE(tax, 0) - COALESCE(discount, 0)
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_oms_order_total
AFTER INSERT OR UPDATE OR DELETE ON public.oms_order_items
FOR EACH ROW EXECUTE FUNCTION update_oms_order_total();

-- 4. OMS Audit Logs
CREATE TABLE IF NOT EXISTS public.oms_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.oms_orders(id) ON DELETE CASCADE,
  user_id UUID, -- References auth.users if available
  action TEXT NOT NULL, -- e.g., 'STATUS_CHANGE', 'PAYMENT_RECEIVED'
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Audit Logs
ALTER TABLE public.oms_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_audit_logs TO service_role USING (true) WITH CHECK (true);
