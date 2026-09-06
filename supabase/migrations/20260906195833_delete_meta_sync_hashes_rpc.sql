-- ============================================================================
-- RPC: delete_meta_sync_hashes
--
-- Atomically removes specific retailer_id keys from meta_sync_state.hashes.
-- Used by the catalog-sync webhook to prune slug-based ghost entries after
-- they are deleted from the Meta catalog (preventing them from being re-pushed
-- by the next full-sync cron run, which would re-create the 0-price ghost entry).
--
-- Runs SECURITY DEFINER so service_role can update the row without needing
-- explicit row-level grants. Only service_role is granted EXECUTE.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_meta_sync_hashes(
  p_id   TEXT,
  p_keys TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hashes JSONB;
  v_key    TEXT;
BEGIN
  SELECT hashes
    INTO v_hashes
    FROM meta_sync_state
   WHERE id = p_id;

  IF v_hashes IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_key IN ARRAY p_keys LOOP
    v_hashes := v_hashes - v_key;
  END LOOP;

  UPDATE meta_sync_state
     SET hashes     = v_hashes,
         updated_at = now()
   WHERE id = p_id;
END;
$$;

-- Restrict: only server-side service_role callers (webhook / cron) should
-- be able to delete hash keys. Public roles must not be able to wipe catalog state.
REVOKE EXECUTE ON FUNCTION public.delete_meta_sync_hashes(TEXT, TEXT[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_meta_sync_hashes(TEXT, TEXT[]) TO service_role;

COMMENT ON FUNCTION public.delete_meta_sync_hashes(TEXT, TEXT[]) IS
  'Atomically remove specific retailer_id keys from meta_sync_state.hashes. '
  'Called after a slug-based Meta catalog entry is successfully deleted so the '
  'key is pruned from the hash map and the full-sync cron does not re-create it.';
