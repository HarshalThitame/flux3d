-- Minimal profiles table creation for local Supabase dev.
-- Required before migration 008_add_profile_role.sql runs.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a test user profile if the test user exists
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, 'Test User'
FROM auth.users
WHERE email = 'test@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.users.id)
ON CONFLICT (id) DO NOTHING;
