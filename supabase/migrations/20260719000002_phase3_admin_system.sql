-- Phase 3 — Admin System Completion
-- Role columns, audit types, printer/manufacturing tables

-- ============================================================
-- 1. New admin role columns on profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_printer_manager boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_qc_manager boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Expand admin_audit_logs target_type CHECK constraint
-- ============================================================
ALTER TABLE public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_target_type_check;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_target_type_check
    CHECK (target_type IN (
      'order', 'user', 'material', 'coupon', 'setting',
      'payment', 'refund', 'printer', 'quote', 'manufacturing', 'admin_user'
    ));

-- ============================================================
-- 3. Printer management tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'printing', 'maintenance', 'offline')),
  build_volume TEXT,
  materials TEXT[] DEFAULT '{}',
  max_speed TEXT,
  notes TEXT,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Print job scheduling
-- ============================================================
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id UUID REFERENCES public.printers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.shelf_orders(id) ON DELETE CASCADE,
  sku_id UUID REFERENCES public.shelf_skus(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'scheduled', 'printing', 'paused', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  estimated_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON public.print_jobs(printer_id, status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON public.print_jobs(order_id);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. QC / Quality control checks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.qc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_job_id UUID REFERENCES public.print_jobs(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.shelf_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'passed', 'failed', 'rework')),
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  passed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qc_checks_job ON public.qc_checks(print_job_id);
CREATE INDEX IF NOT EXISTS idx_qc_checks_order ON public.qc_checks(order_id);

ALTER TABLE public.qc_checks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS policies for new tables
-- ============================================================
DROP POLICY IF EXISTS "printers_service_role_all" ON public.printers;
CREATE POLICY "printers_service_role_all" ON public.printers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "print_jobs_service_role_all" ON public.print_jobs;
CREATE POLICY "print_jobs_service_role_all" ON public.print_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "qc_checks_service_role_all" ON public.qc_checks;
CREATE POLICY "qc_checks_service_role_all" ON public.qc_checks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view printers and jobs
DROP POLICY IF EXISTS "printers_auth_select" ON public.printers;
CREATE POLICY "printers_auth_select" ON public.printers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "print_jobs_auth_select" ON public.print_jobs;
CREATE POLICY "print_jobs_auth_select" ON public.print_jobs
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 7. Grants
-- ============================================================
GRANT ALL ON public.printers, public.print_jobs, public.qc_checks TO service_role;
GRANT SELECT ON public.printers, public.print_jobs, public.qc_checks TO authenticated;

-- Backfill existing profiles with default role flags
UPDATE public.profiles
SET is_printer_manager = false, is_qc_manager = false
WHERE is_printer_manager IS NULL OR is_qc_manager IS NULL;
