-- Add missing columns to materials table
-- This migration adds columns that exist in the full schema but may be missing
-- if auth-schema.sql was applied instead of 001_create_materials.sql

-- Add icon column
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🧩';

-- Add summary column  
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add machine_rate column
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS machine_rate DECIMAL(6,2) DEFAULT 180.00;

-- Add multiplier column
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS multiplier DECIMAL(4,2) DEFAULT 1.00;

-- Add recommended_for column
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS recommended_for TEXT;

-- Add properties column (JSONB)
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}'::jsonb;

-- Add colors column (JSONB)
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb;

-- Ensure id is TEXT type (in case it was created as UUID)
-- Note: This only works if the table is empty or id values are compatible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
  ) THEN
    -- Change id from UUID to TEXT if needed
    ALTER TABLE public.materials ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
