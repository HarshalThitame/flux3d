-- ============================================================================
-- Migration: WhatsApp Media Storage Bucket + Admin-Only RLS
-- Date: 2026-08-14
-- Purpose:
--   1. Create the 'whatsapp-media' Supabase Storage bucket (public read,
--      admin write) used by the WhatsApp inbox upload + inbound media pipeline
--   2. Tighten RLS on the enterprise inbox tables: quick replies, internal
--      notes and conversation metadata are now read-restricted to admins
--      (previously readable by ANY authenticated user)
-- ============================================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  true,
  10485760, -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'audio/ogg',
    'audio/mpeg',
    'video/mp4',
    'application/octet-stream',
    'model/stl',
    'model/3mf',
    'model/obj'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies (same pattern as email-attachments bucket)
DO $$
BEGIN
  -- Policy: Admins can manage objects in whatsapp-media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admin full access on whatsapp-media'
  ) THEN
    CREATE POLICY "Admin full access on whatsapp-media"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'whatsapp-media'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    )
    WITH CHECK (
      bucket_id = 'whatsapp-media'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    );
  END IF;

  -- Policy: Public read access (URLs are shared with Meta Graph API and
  -- rendered inside the admin inbox)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read on whatsapp-media'
  ) THEN
    CREATE POLICY "Public read on whatsapp-media"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (bucket_id = 'whatsapp-media');
  END IF;

  -- Policy: Service role bypass
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role full access on whatsapp-media'
  ) THEN
    CREATE POLICY "Service role full access on whatsapp-media"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'whatsapp-media')
    WITH CHECK (bucket_id = 'whatsapp-media');
  END IF;
END
$$;

-- 3. Tighten RLS: replace the blanket "authenticated SELECT" policies with
--    admin-only policies on the enterprise inbox tables. Admin API routes use
--    the service role, so this only affects direct client access.

DROP POLICY IF EXISTS "quick_replies_authenticated_select" ON public.whatsapp_quick_replies;
CREATE POLICY "quick_replies_admin_select" ON public.whatsapp_quick_replies
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "internal_notes_authenticated_select" ON public.whatsapp_internal_notes;
CREATE POLICY "internal_notes_admin_select" ON public.whatsapp_internal_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "conversation_meta_authenticated_select" ON public.whatsapp_conversation_meta;
CREATE POLICY "conversation_meta_admin_select" ON public.whatsapp_conversation_meta
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));