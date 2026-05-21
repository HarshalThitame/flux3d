CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS gst_number text,
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS preferences,
DROP COLUMN IF EXISTS address;

UPDATE public.profiles
SET name = COALESCE(NULLIF(name, ''), NULLIF(full_name, ''), split_part(email, '@', 1), 'Flux3D User')
WHERE name IS NULL OR name = '';

UPDATE public.profiles
SET full_name = COALESCE(NULLIF(full_name, ''), NULLIF(name, ''), split_part(email, '@', 1), 'Flux3D User')
WHERE full_name IS NULL OR full_name = '';

UPDATE public.profiles
SET phone = NULLIF(phone_number, '')
WHERE (phone IS NULL OR phone = '')
  AND phone_number IS NOT NULL
  AND phone_number <> '';

UPDATE public.profiles
SET phone_number = NULLIF(phone, '')
WHERE (phone_number IS NULL OR phone_number = '')
  AND phone IS NOT NULL
  AND phone <> '';

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (
  name,
  full_name,
  phone,
  phone_number,
  gst_number,
  avatar_url
) ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.model_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  material text,
  status text NOT NULL DEFAULT 'quoted',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.model_files
ADD COLUMN IF NOT EXISTS material text,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'quoted',
ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'model_files_status_check'
      AND conrelid = 'public.model_files'::regclass
  ) THEN
    ALTER TABLE public.model_files
    ADD CONSTRAINT model_files_status_check
    CHECK (status IN ('quoted', 'ordered', 'draft'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_model_files_user_file_url
ON public.model_files(user_id, file_url);

CREATE INDEX IF NOT EXISTS idx_model_files_user_uploaded_at
ON public.model_files(user_id, uploaded_at DESC);

ALTER TABLE public.model_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "model_files_select_own" ON public.model_files;
CREATE POLICY "model_files_select_own" ON public.model_files FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "model_files_insert_own" ON public.model_files;
CREATE POLICY "model_files_insert_own" ON public.model_files FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "model_files_update_own" ON public.model_files;
CREATE POLICY "model_files_update_own" ON public.model_files FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "model_files_delete_own" ON public.model_files;
CREATE POLICY "model_files_delete_own" ON public.model_files FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_files TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.quotes') IS NOT NULL THEN
    INSERT INTO public.model_files (user_id, file_name, file_url, material, status, uploaded_at)
    SELECT
      q.user_id,
      COALESCE(NULLIF(regexp_replace(q.file_path, '^.*/', ''), ''), q.quote_id, 'Uploaded model'),
      q.file_path,
      COALESCE(q.config->>'materialId', 'PLA'),
      'quoted',
      q.created_at
    FROM public.quotes q
    WHERE q.user_id IS NOT NULL
      AND q.file_path IS NOT NULL
      AND q.file_path <> ''
    ON CONFLICT (user_id, file_url) DO NOTHING;
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, "public", file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  "public" = EXCLUDED."public",
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects';
    EXECUTE $policy$
      CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars')
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects';
    EXECUTE $policy$
      CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects';
    EXECUTE $policy$
      CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects';
    EXECUTE $policy$
      CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    $policy$;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping avatar storage policies because this role does not own storage.objects.';
  END;
END;
$$;
