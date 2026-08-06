-- Add idempotency_key and schema improvements to meta_ad_campaigns
ALTER TABLE public.meta_ad_campaigns
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.shelf_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dpa_campaign_record_id UUID REFERENCES public.meta_ad_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS targeting_config JSONB,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_ad_campaigns_idempotency_key
  ON public.meta_ad_campaigns(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_meta_ad_campaigns_category_id
  ON public.meta_ad_campaigns(category_id);

-- Backfill category_id from category_name (best effort)
UPDATE public.meta_ad_campaigns mac
SET category_id = sc.id
FROM public.shelf_categories sc
WHERE mac.category_id IS NULL
  AND sc.name = mac.category_name;

-- Backfill dpa_campaign_record_id (self-reference for DPA rows)
-- Note: this requires the DPA campaigns to also exist in meta_ad_campaigns.
-- We create a follow-up migration if DPA rows need to be inserted separately.

COMMENT ON COLUMN public.meta_ad_campaigns.idempotency_key IS
  'Prevents duplicate campaign creation for the same admin/category/budget/day combination.';

COMMENT ON COLUMN public.meta_ad_campaigns.category_id IS
  'Foreign key to shelf_categories for referential integrity (backfilled from category_name).';

COMMENT ON COLUMN public.meta_ad_campaigns.dpa_campaign_record_id IS
  'Self-referencing FK to the DPA retargeting campaign record, if one exists.';

COMMENT ON COLUMN public.meta_ad_campaigns.targeting_config IS
  'JSONB storage for editable audience targeting (age, geo, interests, placements).';

COMMENT ON COLUMN public.meta_ad_campaigns.updated_by IS
  'Admin user who last modified this campaign record.';
