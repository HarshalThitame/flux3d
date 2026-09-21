-- Phase 4: File Management & Documents

-- 1. STL / 3D File Tracking
CREATE TABLE IF NOT EXISTS public.oms_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.oms_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.oms_order_items(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'stl', 'obj', '3mf', 'step', 'pdf', 'image'
  file_size_bytes BIGINT,
  version INTEGER DEFAULT 1,
  
  uploaded_by UUID, -- References auth.users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  is_latest BOOLEAN DEFAULT true
);

ALTER TABLE public.oms_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_files TO service_role USING (true) WITH CHECK (true);

-- 2. Quotes and Invoices
CREATE TABLE IF NOT EXISTS public.oms_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.oms_orders(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL, -- 'QUOTATION' | 'INVOICE'
  document_number TEXT UNIQUE NOT NULL, -- e.g., Q-2026-00123 or INV-2026-00123
  
  file_url TEXT,
  valid_until TIMESTAMPTZ, -- for quotes
  payment_terms TEXT,
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID
);

ALTER TABLE public.oms_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.oms_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for service role" ON public.oms_documents TO service_role USING (true) WITH CHECK (true);
