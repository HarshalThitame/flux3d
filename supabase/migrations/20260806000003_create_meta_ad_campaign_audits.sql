-- Audit trail for meta ad campaign mutations
CREATE TABLE public.meta_ad_campaign_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.meta_ad_campaigns(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'toggle', 'edit_budget', 'edit_name', 'edit_targeting', 'archive', 'duplicate')),
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  old_value JSONB,
  new_value JSONB,
  meta_api_response JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.meta_ad_campaign_audits IS
  'Immutable audit log for every mutating action on Meta ad campaigns. Used for compliance, debugging, and accountability.';

CREATE INDEX IF NOT EXISTS idx_meta_ad_campaign_audits_campaign_id ON public.meta_ad_campaign_audits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_campaign_audits_performed_by ON public.meta_ad_campaign_audits(performed_by);
CREATE INDEX IF NOT EXISTS idx_meta_ad_campaign_audits_created_at ON public.meta_ad_campaign_audits(created_at DESC);

ALTER TABLE public.meta_ad_campaign_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ad_campaign_audits_admin_read"
  ON public.meta_ad_campaign_audits
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin')
    OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin')
  );

CREATE POLICY "meta_ad_campaign_audits_admin_insert"
  ON public.meta_ad_campaign_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin')
    OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin')
  );
