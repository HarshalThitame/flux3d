-- ============================================================================
-- Migration: Lock down account-linking related function EXECUTE grants
-- Date: 2026-08-05
-- Purpose:
--   Supabase's default privileges grant EXECUTE on every new function to
--   anon/authenticated/service_role, and `REVOKE ... FROM PUBLIC` does not
--   undo those role-specific grants. Audit on the live DB showed:
--     * account_linking_merge_to_user — anon could EXECUTE (the in-function
--       service_role guard already returns 0 rows, but the grant should not
--       exist at all)
--     * cleanup_link_requests — anon + authenticated could EXECUTE
--     * purge_old_records (SECURITY DEFINER; deletes error_logs, page_visits,
--       search_logs, feature_usage, user_sessions, link_requests, consent_log
--       past retention) — anon + authenticated + PUBLIC could EXECUTE,
--       letting any signed-in user destroy retention-age DPDP evidence.
--   All production callers use the service-role client (cron cleanup route,
--   admin retention route behind requireAdminPermission('audit.view')).
-- ============================================================================

REVOKE ALL ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_link_requests(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_link_requests(integer) TO service_role;

REVOKE ALL ON FUNCTION public.purge_old_records(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_records(integer) TO service_role;
