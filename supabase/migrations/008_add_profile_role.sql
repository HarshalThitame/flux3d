-- Add role column to profiles table for admin access control
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Reset profiles RLS policies to avoid infinite recursion.
-- Admin queries use the service_role key (bypasses RLS), so we keep policies simple.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_upsert_own" ON public.profiles;
CREATE POLICY "profiles_upsert_own" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Materials policies — fix infinite recursion by using JWT claims instead of profiles lookup
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

-- Auto-set the first user as admin (if no admin exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role IN ('admin', 'super-admin')) THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);
  END IF;
END $$;
