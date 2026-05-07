-- Remove role-based access control. Admin access is now determined by
-- a static email/password configured in ADMIN_EMAIL / ADMIN_PASSWORD env vars.

-- Drop policies that depend on the role column first
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Drop materials admin policies that relied on JWT role claims.
-- Admin API operations use the service_role key (bypasses RLS).
DROP POLICY IF EXISTS "materials_insert_admin" ON public.materials;
DROP POLICY IF EXISTS "materials_update_admin" ON public.materials;
DROP POLICY IF EXISTS "materials_delete_admin" ON public.materials;
