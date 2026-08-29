-- Ensure the shop-images storage bucket exists and is public.
-- Product images, SKU images, variant images, and 3D model textures
-- are all stored here and served via public URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-images',
  'shop-images',
  true,
  52428800,  -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/octet-stream',
    'model/stl',
    'model/3mf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for storefront images (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view shop images'
  ) THEN
    CREATE POLICY "Public can view shop images"
      ON storage.objects
      FOR SELECT USING (bucket_id = 'shop-images');
  END IF;
END $$;

-- Authenticated users (admins) can upload (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated can upload shop images'
  ) THEN
    CREATE POLICY "Authenticated can upload shop images"
      ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'shop-images');
  END IF;
END $$;

-- Service role has full access (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role can manage shop images'
  ) THEN
    CREATE POLICY "Service role can manage shop images"
      ON storage.objects
      FOR ALL USING (bucket_id = 'shop-images');
  END IF;
END $$;
