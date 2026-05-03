-- Run this in your Supabase SQL Editor to create the storage bucket
-- This fixes the "Storage upload failed: database error, code: 42704" error

-- Create the quote-models bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-models',
  'quote-models',
  false,
  104857600,  -- 100MB limit
  ARRAY['model/stl', 'text/plain', 'model/3mf', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'quote-models';
