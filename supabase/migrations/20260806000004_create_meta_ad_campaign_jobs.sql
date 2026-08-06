-- Async job queue for meta ad campaign creation
CREATE TABLE public.meta_ad_campaign_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payload JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.meta_ad_campaign_jobs IS
  'Queue for asynchronous Meta ad campaign creation jobs. Processed by QStash workers.';

CREATE INDEX idx_meta_ad_campaign_jobs_status ON public.meta_ad_campaign_jobs(status);
CREATE INDEX idx_meta_ad_campaign_jobs_created_by ON public.meta_ad_campaign_jobs(created_by);
CREATE INDEX idx_meta_ad_campaign_jobs_created_at ON public.meta_ad_campaign_jobs(created_at DESC);

ALTER TABLE public.meta_ad_campaign_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ad_campaign_jobs_admin_read"
  ON public.meta_ad_campaign_jobs
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin')
    OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin')
  );

CREATE POLICY "meta_ad_campaign_jobs_admin_write"
  ON public.meta_ad_campaign_jobs
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin')
    OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin')
    OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin')
  );
