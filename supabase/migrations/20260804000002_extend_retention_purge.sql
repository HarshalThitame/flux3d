-- Extend purge_old_records to cover link_requests and consent_log
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

  DELETE FROM public.user_sessions WHERE started_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'user_sessions'; deleted_count := deleted; RETURN NEXT;

  -- Account linking: purge expired, unconfirmed link requests
  DELETE FROM public.link_requests
  WHERE confirmed_at IS NULL
    AND expires_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'link_requests'; deleted_count := deleted; RETURN NEXT;

  -- Account linking: purge withdrawn or old consent logs (keep last 90 days by default)
  DELETE FROM public.consent_log
  WHERE withdrawn_at IS NOT NULL
    AND withdrawn_at < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'consent_log'; deleted_count := deleted; RETURN NEXT;

  -- Also purge non-withdrawn consent logs older than retention period
  DELETE FROM public.consent_log
  WHERE granted = FALSE
    AND timestamp < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'consent_log_denied'; deleted_count := deleted; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_old_records(INTEGER) TO service_role;