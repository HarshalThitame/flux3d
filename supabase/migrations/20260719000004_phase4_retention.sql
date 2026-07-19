-- Phase 4 — Data Retention & Privacy
-- Adds indexes for cleanup, purge RPC, deletion endpoint support

-- ============================================================
-- 1. Indexes for efficient cleanup queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred_at ON public.error_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON public.page_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_searched_at ON public.search_logs(searched_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_used_at ON public.feature_usage(used_at);

-- ============================================================
-- 2. Purge old records RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.purge_old_records(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
  deleted BIGINT;
BEGIN
  DELETE FROM public.error_logs WHERE occurred_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'error_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.page_visits WHERE visited_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'page_visits'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.search_logs WHERE searched_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'search_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.feature_usage WHERE used_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'feature_usage'; deleted_count := deleted; RETURN NEXT;

  -- sessions: keep ended sessions older than cutoff but keep active ones
  DELETE FROM public.user_sessions
  WHERE started_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'user_sessions'; deleted_count := deleted; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_old_records(INTEGER) TO service_role;

-- ============================================================
-- 3. User data deletion RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted BIGINT;
BEGIN
  DELETE FROM public.error_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'error_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.page_visits WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'page_visits'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.feature_usage WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'feature_usage'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.search_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'search_logs'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'user_sessions'; deleted_count := deleted; RETURN NEXT;

  DELETE FROM public.addresses WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'addresses'; deleted_count := deleted; RETURN NEXT;

  -- Anonymize orders (keep for legal compliance, remove PII)
  UPDATE public.orders SET
    full_name = '[deleted]',
    phone = '[deleted]',
    address_line1 = '[deleted]',
    address_line2 = NULL,
    landmark = NULL
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'orders_anonymized'; deleted_count := deleted; RETURN NEXT;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = p_user_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'profiles'; deleted_count := deleted; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO service_role;
