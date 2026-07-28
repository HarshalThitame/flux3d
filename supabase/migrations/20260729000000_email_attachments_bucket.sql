-- ============================================================================
-- Migration: Email Attachments Storage Bucket
-- Date: 2026-07-29
-- Purpose:
--   1. Create the 'email-attachments' Supabase Storage bucket
--   2. Set up RLS policies for admin-only writes, public reads
--   3. Add bucket configuration (max file size, allowed MIME types)
-- ============================================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  true,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for storage.objects
--    Authenticated admin users: full CRUD
--    Anonymous / non-admin: read-only (public bucket)
--    Service role: full access

-- Note: RLS on storage.objects is managed by Supabase; we skip ALTER TABLE
-- and only create policies if they don't exist.

DO $$
BEGIN
  -- Policy: Admins can manage objects in email-attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admin full access on email-attachments'
  ) THEN
    CREATE POLICY "Admin full access on email-attachments"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'email-attachments'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    )
    WITH CHECK (
      bucket_id = 'email-attachments'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    );
  END IF;

  -- Policy: Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read on email-attachments'
  ) THEN
    CREATE POLICY "Public read on email-attachments"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (bucket_id = 'email-attachments');
  END IF;

  -- Policy: Service role bypass
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role full access on email-attachments'
  ) THEN
    CREATE POLICY "Service role full access on email-attachments"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'email-attachments')
    WITH CHECK (bucket_id = 'email-attachments');
  END IF;
END
$$;
