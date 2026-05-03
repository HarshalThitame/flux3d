-- Fix 42704 error: Ensure storage schema is accessible
-- Run this in Supabase SQL Editor

-- 1. Check if storage schema exists and is accessible
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'storage';

-- 2. Check if storage.objects table exists with correct columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'storage' AND table_name = 'objects'
ORDER BY ordinal_position;

-- 3. Drop all existing policies on storage.objects for quote-models
DROP POLICY IF EXISTS "quote_models_select_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_update_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_delete_own" ON storage.objects;

-- 4. Create MAXIMALLY simple policies (no functions at all)
-- Select policy
CREATE POLICY "quote_models_select_own" ON storage.objects
FOR SELECT TO authenticated
USING ( bucket_id = 'quote-models' );

-- Insert policy  
CREATE POLICY "quote_models_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'quote-models' );

-- Update policy
CREATE POLICY "quote_models_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING ( bucket_id = 'quote-models' )
WITH CHECK ( bucket_id = 'quote-models' );

-- Delete policy
CREATE POLICY "quote_models_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING ( bucket_id = 'quote-models' );

-- 5. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Verify policies
SELECT policyname, cmd, qual FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
