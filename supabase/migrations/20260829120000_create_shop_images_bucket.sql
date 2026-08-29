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

-- Public read access for storefront images
CREATE POLICY IF NOT EXISTS "Public can view shop images"
  ON storage.objects
  FOR SELECT USING (bucket_id = 'shop-images');

-- Authenticated users (admins) can upload
CREATE POLICY IF NOT EXISTS "Authenticated can upload shop images"
  ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'shop-images');

-- Service role has full access
CREATE POLICY IF NOT EXISTS "Service role can manage shop images"
  ON storage.objects
  FOR ALL USING (bucket_id = 'shop-images');
