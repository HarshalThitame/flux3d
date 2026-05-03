-- Fix 42704 error: Completely replace storage RLS policies
-- Run this in Supabase SQL Editor

-- 1. First, let's see what policies exist on storage.objects
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 2. Drop ALL existing policies on storage.objects (we'll recreate fresh)
DROP POLICY IF EXISTS "quote_models_select_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_update_own" ON storage.objects;
DROP POLICY IF EXISTS "quote_models_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "simple_select" ON storage.objects;
DROP POLICY IF EXISTS "simple_insert" ON storage.objects;
DROP POLICY IF EXISTS "simple_update" ON storage.objects;
DROP POLICY IF EXISTS "simple_delete" ON storage.objects;

-- 3. Disable RLS temporarily to test if upload works
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 4. Now try the upload from your app. If it works, RLS was the issue.
-- After confirming, re-enable RLS with MAXIMALLY simple policies:

-- Re-enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies that ONLY check bucket_id (no function calls at all)
CREATE POLICY "bucket_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'quote-models');

CREATE POLICY "bucket_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quote-models');

CREATE POLICY "bucket_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'quote-models')
WITH CHECK (bucket_id = 'quote-models');

CREATE POLICY "bucket_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'quote-models');

-- 5. Verify the new policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
