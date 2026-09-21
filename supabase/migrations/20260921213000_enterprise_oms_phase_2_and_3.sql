-- Phase 2: Fulfillment & Shipping
CREATE TABLE IF NOT EXISTS public.oms_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.oms_orders(id) ON DELETE CASCADE,
  
  -- Shipping Address Snapshot (so it doesn't change if customer profile updates)
  shipping_name TEXT NOT NULL,
  shipping_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  
  -- Logistics Info
  courier_name TEXT,
  awb_number TEXT,
  tracking_url TEXT,
  shipping_method TEXT,
  
  -- Timestamps
  expected_ship_date TIMESTAMPTZ,
  actual_ship_date TIMESTAMPTZ,
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for oms_shipments
ALTER TABLE public.oms_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_shipments TO service_role USING (true) WITH CHECK (true);

-- Phase 3: 3D Production Management
CREATE TABLE IF NOT EXISTS public.oms_production_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.oms_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.oms_order_items(id) ON DELETE CASCADE,
  
  printer_name TEXT, -- e.g., Bambu Lab X1C
  operator_id UUID,
  
  status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED | PRINTING | COMPLETED | FAILED | QC_FAILED | QC_PASSED
  priority TEXT DEFAULT 'NORMAL',
  
  estimated_time_mins INTEGER,
  actual_time_mins INTEGER,
  
  production_started_at TIMESTAMPTZ,
  production_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for oms_production_jobs
ALTER TABLE public.oms_production_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_production_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_production_jobs TO service_role USING (true) WITH CHECK (true);

-- Track print failures and yields
CREATE TABLE IF NOT EXISTS public.oms_print_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.oms_production_jobs(id) ON DELETE CASCADE,
  
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL, -- COMPLETED | FAILED
  failure_reason TEXT, -- 'Layer Adhesion', 'Spaghetti', 'Warping', 'Clog', 'Power Failure'
  operator_notes TEXT,
  
  material_used_grams DECIMAL,
  filament_type TEXT,
  filament_color TEXT,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS for oms_print_attempts
ALTER TABLE public.oms_print_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_print_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_print_attempts TO service_role USING (true) WITH CHECK (true);
