-- ============================================================================
-- Shared Media Library
-- Every shop image upload is registered here so admins can reuse existing
-- assets instead of re-uploading duplicates.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shelf_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_url TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  size_bytes BIGINT,
  content_hash TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.shelf_media_assets IS
  'Registry of uploaded shop media for the admin library and content-hash dedupe.';

CREATE INDEX IF NOT EXISTS idx_shelf_media_assets_hash
  ON public.shelf_media_assets(content_hash);
CREATE INDEX IF NOT EXISTS idx_shelf_media_assets_created
  ON public.shelf_media_assets(created_at DESC);

ALTER TABLE public.shelf_media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shelf_media_assets_public_read"
  ON public.shelf_media_assets
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "shelf_media_assets_service_role_write"
  ON public.shelf_media_assets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
