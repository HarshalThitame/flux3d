-- ============================================================================
-- Migration: Make the WhatsApp media bucket PRIVATE (signed-URL access only)
-- Date: 2026-08-25
-- Purpose:
--   Customer attachments (photos, documents, voice notes) were readable by
--   ANYONE who obtained the URL — a privacy/compliance risk. The bucket is now
--   private; access happens exclusively through short-lived signed URLs that
--   the admin inbox API mints at read time.
--
--   Outbound admin attachments sent to customers still work: Meta is given a
--   signed link (max 7 days) at send time.
-- ============================================================================

-- 1. Flip the bucket to private
UPDATE storage.buckets
SET public = false
WHERE id = 'whatsapp-media';

-- 2. Remove anonymous read access
DROP POLICY IF EXISTS "Public read on whatsapp-media" ON storage.objects;

-- Note: "Admin full access on whatsapp-media" (FOR ALL, TO authenticated) and
-- "Service role full access on whatsapp-media" already cover signed-URL minting
-- for admins and server code respectively — no new policies required.
