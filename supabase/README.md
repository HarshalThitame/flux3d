# Supabase Setup for Flux3D

## Materials Table Setup

Run this SQL in your Supabase SQL Editor to create the materials table:

```sql
-- Create materials table for admin management
CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🧩',
  summary TEXT,
  density DECIMAL(5,2) DEFAULT 1.24,
  price_per_gram DECIMAL(5,2) DEFAULT 2.80,
  machine_rate DECIMAL(6,2) DEFAULT 180.00,
  multiplier DECIMAL(4,2) DEFAULT 1.00,
  recommended_for TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (materials are public)
CREATE POLICY "Materials are publicly readable" 
  ON public.materials 
  FOR SELECT 
  USING (true);

-- Create policy for admin write access
CREATE POLICY "Admin can manage materials" 
  ON public.materials 
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON public.materials(created_at DESC);
```

## API Endpoints

- `GET /api/materials` - Fetch all materials (public)
- `POST /api/materials` - Create new material (admin only)

## Admin Panel

Navigate to `/admin/materials` to:
- View all materials
- Add new materials
- Edit existing materials
- Delete materials

## How It Works

1. Admin adds materials via `/admin/materials`
2. Quote system fetches materials from `/api/materials`
3. Users can select from available materials when getting quotes
4. No more hardcoded mock data - everything is database-driven
