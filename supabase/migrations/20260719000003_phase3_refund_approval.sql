-- Phase 3 — Refund Approval Workflow
-- pending_approval status, refund_approvals table, dual-control audit

ALTER TABLE public.payment_refunds
  DROP CONSTRAINT IF EXISTS payment_refunds_status_check;

ALTER TABLE public.payment_refunds
  ADD CONSTRAINT payment_refunds_status_check
    CHECK (status IN ('pending_approval', 'created', 'pending', 'processed', 'failed', 'cancelled'));

CREATE TABLE IF NOT EXISTS public.refund_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES public.payment_refunds(id) ON DELETE CASCADE,
  initiated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  threshold_paise BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refund_approvals_refund ON public.refund_approvals(refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_approvals_status ON public.refund_approvals(status);

ALTER TABLE public.refund_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_approvals_service_role" ON public.refund_approvals;
CREATE POLICY "refund_approvals_service_role" ON public.refund_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.refund_approvals TO service_role;
