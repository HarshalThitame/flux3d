-- ============================================================================
-- Fix: /admin/customers fails with "permission denied for table users"
-- Date: 2026-08-27
--
-- admin_customer_list / admin_customer_order_stats were defined
-- WITH (security_invoker = true). Queried through the service-role client
-- (createAdminClient), the SELECT runs as service_role, which has no SELECT
-- grant on the underlying auth.users table, so Postgres raised:
--
--   ERROR: permission denied for table users
--
-- That 500'd the customers page (SSR) plus /api/admin/customers and
-- /api/admin/customers/stats.
--
-- Fix: run the views with owner (postgres) privileges, like the original
-- pre-hardening definition did. Access stays locked to service_role only
-- (grants re-asserted below); service_role already bypasses RLS, so there is
-- no security regression.
-- ============================================================================

ALTER VIEW public.admin_customer_order_stats SET (security_invoker = false);
ALTER VIEW public.admin_customer_list SET (security_invoker = false);

-- Re-assert the service_role-only grant boundary (idempotent).
REVOKE ALL ON public.admin_customer_list FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_customer_order_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_customer_list TO service_role;
GRANT SELECT ON public.admin_customer_order_stats TO service_role;