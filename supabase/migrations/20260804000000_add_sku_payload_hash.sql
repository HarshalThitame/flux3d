-- Track last-synced Meta catalog payload hash per SKU so the 6-hourly
-- full-sync cron can skip unchanged items. Re-pushing unchanged items via
-- items_batch UPDATE re-triggers WhatsApp review on every run, flipping
-- APPROVED items to OUTDATED/NO_REVIEW and hiding them from customers.
ALTER TABLE public.shelf_skus
  ADD COLUMN IF NOT EXISTS meta_payload_hash text;

CREATE INDEX IF NOT EXISTS idx_shelf_skus_meta_payload_hash
  ON public.shelf_skus (meta_payload_hash) WHERE meta_payload_hash IS NOT NULL;
