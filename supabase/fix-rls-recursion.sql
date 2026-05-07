-- Fix infinite recursion in profiles RLS policies
-- Run this in Supabase SQL Editor if you already applied the bad migration

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

-- Fix materials policies (same recursion issue)
DROP POLICY IF EXISTS "materials_insert_admin" ON public.materials;
CREATE POLICY "materials_insert_admin" ON public.materials FOR INSERT TO authenticated
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'super-admin') OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin'));

DROP POLICY IF EXISTS "materials_update_admin" ON public.materials;
CREATE POLICY "materials_update_admin" ON public.materials FOR UPDATE TO authenticated
USING (auth.jwt() ->> 'role' IN ('admin', 'super-admin') OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'super-admin') OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin'));

DROP POLICY IF EXISTS "materials_delete_admin" ON public.materials;
CREATE POLICY "materials_delete_admin" ON public.materials FOR DELETE TO authenticated
USING (auth.jwt() ->> 'role' IN ('admin', 'super-admin') OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin'));
