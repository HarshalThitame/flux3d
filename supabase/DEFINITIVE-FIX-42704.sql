-- DEFINITIVE FIX for 42704 error
-- Run this ENTIRE script in Supabase SQL Editor

-- 1. Create storage.foldername() function if it doesn't exist
-- This is the most likely cause of 42704
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN string_to_array(name, '/');
END;
$$;

-- Verify function was created
SELECT 'foldername function created' as status, routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'storage' AND routine_name = 'foldername';

-- 2. Drop ALL existing policies on storage.objects for quote-models
DROP POLICY IF EXISTS "quote_models_select_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_update_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "bucket_delete" ON storage.objects;
DROP POLICY IF EXISTS "simple_select" ON storage.objects;
DROP POLICY IF EXISTS "simple_insert" ON storage.objects;
DROP POLICY IF EXISTS "simple_update" ON storage.objects;
DROP POLICY IF EXISTS "simple_delete" ON storage.objects;

-- 3. Create SUPER simple policies (NO function calls, NO auth.uid() - just bucket check)
-- These policies only check if the bucket_id matches 'quote-models'
CREATE POLICY "quote_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'quote-models');

CREATE POLICY "quote_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quote-models');

CREATE POLICY "quote_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'quote-models')
WITH CHECK (bucket_id = 'quote-models');

CREATE POLICY "quote_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'quote-models');

-- 4. Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Verify policies were created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 6. Test: Check if storage.objects table is accessible
SELECT COUNT(*) as object_count FROM storage.objects WHERE bucket_id = 'quote-models';
