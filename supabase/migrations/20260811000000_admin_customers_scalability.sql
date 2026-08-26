-- ============================================================================
-- Admin customers scalability
--
-- * Denormalizes customer status/settings onto profiles so the admin list no
--   longer needs to load every auth user (listAllAuthUsers) to know status.
-- * Backfills new columns from auth data.
-- * Adds a read-model view (admin_customer_list) so the admin customers list
--   can page/sort/filter server-side with exact counts.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_method text NOT NULL DEFAULT 'Email',
  ADD COLUMN IF NOT EXISTS manual_coupon text,
  ADD COLUMN IF NOT EXISTS manual_credit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Backfill suspended_at from auth bans that are still active.
UPDATE public.profiles p
SET suspended_at = u.banned_until
FROM auth.users u
WHERE p.id = u.id
  AND u.banned_until IS NOT NULL
  AND u.banned_until > now()
  AND p.suspended_at IS NULL;

-- Backfill signup method from auth provider metadata.
UPDATE public.profiles p
SET signup_method = CASE LOWER(COALESCE(u.raw_app_meta_data->>'provider', ''))
  WHEN 'google' THEN 'Google'
  WHEN 'github' THEN 'GitHub'
  ELSE 'Email'
END
FROM auth.users u
WHERE p.id = u.id;

-- Backfill manual coupon / credit from auth app metadata.
UPDATE public.profiles p
SET
  manual_coupon = COALESCE(NULLIF(u.raw_app_meta_data->>'manual_coupon', ''), p.manual_coupon),
  manual_credit = COALESCE(
    NULLIF(u.raw_app_meta_data->>'manual_credit', '')::numeric,
    p.manual_credit
  )
FROM auth.users u
WHERE p.id = u.id
  AND (
    (p.manual_coupon IS NULL AND u.raw_app_meta_data->>'manual_coupon' <> '')
    OR (p.manual_credit = 0 AND u.raw_app_meta_data->>'manual_credit' IS NOT NULL)
  );

-- Read-model view: per-user order aggregates used for server-side sorting.
-- SECURITY: owner-privileged (runs as the view owner) and only granted to
-- service_role; anon/authenticated never read auth.users through this view.
CREATE OR REPLACE VIEW public.admin_customer_order_stats AS
SELECT
  o.user_id,
  COUNT(*)::bigint AS total_orders,
  COALESCE(SUM(COALESCE(o.grand_total, o.final_price, o.total_price, 0)), 0)::numeric AS total_spent,
  MAX(o.created_at) AS last_order_date,
  MIN(o.created_at) AS first_order_date
FROM public.orders o
WHERE o.user_id IS NOT NULL
GROUP BY o.user_id;

-- Read-model view: paged list source for the admin customers table.
-- signup_method and email_confirmed_at are computed live from auth.users so
-- the list stays accurate for new signups without a sync trigger.
-- SECURITY: owner-privileged (runs as the view owner) + service_role-only
-- grants — anon/authenticated must never be able to read auth.users data.
CREATE OR REPLACE VIEW public.admin_customer_list AS
SELECT
  p.id,
  p.name,
  p.full_name,
  p.email,
  p.phone,
  p.created_at,
  p.last_seen_at,
  p.status,
  p.suspended_at,
  p.is_admin,
  p.manual_coupon,
  p.manual_credit,
  u.email_confirmed_at,
  CASE LOWER(COALESCE(u.raw_app_meta_data->>'provider', ''))
    WHEN 'google' THEN 'Google'
    WHEN 'github' THEN 'GitHub'
    ELSE 'Email'
  END AS signup_method,
  COALESCE(s.total_orders, 0)::bigint AS total_orders,
  COALESCE(s.total_spent, 0)::numeric AS total_spent,
  s.last_order_date,
  s.first_order_date
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN public.admin_customer_order_stats s ON s.user_id = p.id;

-- Revoke any accidental broad grants (default PUBLIC grants) and re-grant
-- only to the service role.
REVOKE ALL ON public.admin_customer_list FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_customer_order_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_customer_list TO service_role;
GRANT SELECT ON public.admin_customer_order_stats TO service_role;

-- Indexes backing the list filters and joins.
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at_desc ON public.profiles (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_at ON public.profiles (suspended_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_created_at ON public.orders (user_id, created_at DESC);