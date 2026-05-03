-- Diagnostic script for error 42704 (undefined object)
-- Run this in Supabase SQL Editor to find the root cause

-- 1. Check if quote-models bucket exists
SELECT 'Bucket check' as check_type, * FROM storage.buckets WHERE id = 'quote-models';

-- 2. Check if quotes table exists and has all required columns
SELECT 
  'quotes table columns' as check_type,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'quotes'
ORDER BY ordinal_position;

-- 3. Check if orders table exists
SELECT 
  'orders table columns' as check_type,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- 4. Check storage RLS policies (these may reference non-existent objects)
SELECT 
  'storage policies' as check_type,
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 5. Check if storage.foldername function exists (used in RLS policies)
SELECT 
  'storage.foldername function' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'storage' AND routine_name = 'foldername';

-- 6. Try a test upload query to see exact error
-- This will fail with 42704 if something is missing
DO $$
BEGIN
  BEGIN
    PERFORM storage.foldername('test/name');
    RAISE NOTICE 'storage.foldername function works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'storage.foldername error: %', SQLERRM;
  END;
END $$;

-- 7. Check for any missing tables referenced in RLS policies
-- This queries information_schema to find what might be missing
SELECT 
  'potential_missing_objects' as check_type,
  pg_class.relname as object_name,
  pg_namespace.nspname as schema_name,
  pg_class.relkind as object_type
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname IN ('public', 'storage')
  AND pg_class.relname IN ('quotes', 'orders', 'profiles', 'storage.objects', 'storage.buckets')
ORDER BY pg_namespace.nspname, pg_class.relname;
