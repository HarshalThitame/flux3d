-- Dedicated persistent store for Meta catalog sync payload hashes.
--
-- Previously the hash map lived as a single JSONB row in `error_logs`
-- (source = 'meta_catalog_sync_state'). That table is purged by
-- purge_old_records(90) on occurred_at, so after ~90 days the state row was
-- deleted, forcing a full catalog re-push and re-triggering WhatsApp review
-- churn (APPROVED -> OUTDATED/NO_REVIEW) — exactly what the hash store was
-- built to prevent. This table is NOT subject to any retention purge.
--
-- Also adds an atomic merge RPC: the webhook handler and the 6-hourly cron
-- previously did read-modify-write of the same JSONB blob with no locking,
-- so concurrent runs could lose each other's hash updates.

CREATE TABLE IF NOT EXISTS public.meta_sync_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hashes JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.meta_sync_state IS
  'Per-SKU Meta catalog payload hashes (retailer_id -> sha256). Skipped items during change-aware full sync to avoid re-triggering WhatsApp review.';

ALTER TABLE public.meta_sync_state ENABLE ROW LEVEL SECURITY;

-- Internal infrastructure table: only service_role (server code) touches it.
REVOKE ALL ON public.meta_sync_state FROM PUBLIC;
REVOKE ALL ON public.meta_sync_state FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_sync_state TO service_role;

-- Atomic read-modify-write-safe merge. Shallow JSONB merge at the top level is
-- correct here because keys are retailer_ids; concurrent writers each add their
-- own SKU entries without clobbering each other's.
CREATE OR REPLACE FUNCTION public.merge_meta_sync_hashes(p_id TEXT, p_hashes JSONB)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.meta_sync_state (id, hashes)
  VALUES (p_id, p_hashes)
  ON CONFLICT (id) DO UPDATE
    SET hashes = public.meta_sync_state.hashes || EXCLUDED.hashes,
        updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.merge_meta_sync_hashes(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_meta_sync_hashes(TEXT, JSONB) TO service_role;

-- One-time migration of existing state from error_logs (newest state row wins).
INSERT INTO public.meta_sync_state (id, hashes)
SELECT 'default', metadata::jsonb
FROM public.error_logs
WHERE source = 'meta_catalog_sync_state'
  AND metadata IS NOT NULL
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE SET hashes = EXCLUDED.hashes, updated_at = now();
