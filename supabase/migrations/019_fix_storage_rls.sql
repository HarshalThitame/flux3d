-- Fix 42704 error: replace storage.foldername() with built-in PostgreSQL functions
-- Run this in Supabase SQL Editor

-- 1. Drop existing problematic policies on storage.objects for quote-models bucket
DROP POLICY IF EXISTS "quote_models_select_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_update_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_delete_own" ON storage.objects;

-- 2. Create simple policies using split_part() instead of storage.foldername()
-- This avoids dependency on storage.foldername() function

-- SELECT policy: users can select their own files (path starts with their user ID)
CREATE POLICY "quote_models_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'quote-models' AND
  (split_part(name, '/', 1)) = auth.uid()::text
);

-- INSERT policy: users can upload to their own folder
CREATE POLICY "quote_models_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'quote-models' AND
  (split_part(name, '/', 1)) = auth.uid()::text
);

-- UPDATE policy: users can update their own files
CREATE POLICY "quote_models_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'quote-models' AND
  (split_part(name, '/', 1)) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'quote-models' AND
  (split_part(name, '/', 1)) = auth.uid()::text
);

-- DELETE policy: users can delete their own files
CREATE POLICY "quote_models_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'quote-models' AND
  (split_part(name, '/', 1)) = auth.uid()::text
);

-- 3. Ensure RLS is enabled on storage.objects (skipped — schema owned by supabase_storage_admin)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Verify policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
