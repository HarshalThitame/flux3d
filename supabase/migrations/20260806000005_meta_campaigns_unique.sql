-- Add unique constraint on campaign_id to prevent duplicate local records
ALTER TABLE public.meta_ad_campaigns
  ADD CONSTRAINT uq_meta_ad_campaigns_campaign_id UNIQUE (campaign_id);

COMMENT ON CONSTRAINT uq_meta_ad_campaigns_campaign_id ON public.meta_ad_campaigns IS
  'Ensures each Meta campaign ID is stored exactly once locally, preventing orphaned or duplicate rows.';
