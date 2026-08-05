CREATE TABLE public.meta_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  adset_id TEXT NOT NULL,
  creative_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT 'SALES',
  status TEXT NOT NULL DEFAULT 'PAUSED',
  daily_budget_paise INTEGER NOT NULL DEFAULT 0,
  category_name TEXT,
  product_count INTEGER DEFAULT 0,
  pixel_id TEXT,
  page_id TEXT,
  dpa_campaign_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.meta_ad_campaigns IS
  'Local mirror of Meta ad campaigns created via the Flux3D admin dashboard. Stores IDs for reconciliation and audit.';

CREATE INDEX idx_meta_ad_campaigns_campaign_id ON public.meta_ad_campaigns(campaign_id);
CREATE INDEX idx_meta_ad_campaigns_created_by ON public.meta_ad_campaigns(created_by);
CREATE INDEX idx_meta_ad_campaigns_status ON public.meta_ad_campaigns(status);

ALTER TABLE public.meta_ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ad_campaigns_admin_read"
  ON public.meta_ad_campaigns
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin')
    OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin')
  );

CREATE POLICY "meta_ad_campaigns_admin_write"
  ON public.meta_ad_campaigns
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

CREATE TRIGGER set_meta_ad_campaigns_updated_at
  BEFORE UPDATE ON public.meta_ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
