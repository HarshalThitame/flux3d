# Vercel Deployment Setup for Flux3D

## Environment Variables Needed in Vercel

Go to your Vercel project settings → Environment Variables and add:

### Required Variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase service_role key (from Project Settings → API)
   - ⚠️ Keep this secret! Only use in server-side code.

4. **NEXT_PUBLIC_SITE_URL**
   - Value: `https://your-domain.vercel.app` (or your custom domain)

### How to Find These Values:

1. Go to your Supabase project dashboard
2. Click on **Project Settings** (gear icon)
3. Click on **API** in the sidebar
4. Copy:
   - **URL**: `https://xxxxx.supabase.co`
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - ⚠️ Keep secret!

## Supabase Table Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Create materials table
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

-- Allow public read access
CREATE POLICY "Materials are publicly readable" 
  ON public.materials 
  FOR SELECT 
  USING (true);

-- Allow service_role to manage materials (for API routes)
CREATE POLICY "Service role can manage materials" 
  ON public.materials 
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_materials_created_at 
  ON public.materials(created_at DESC);

-- Optional: Insert default materials
INSERT INTO public.materials (id, name, icon, summary, density, price_per_gram, machine_rate, multiplier, recommended_for, properties, colors)
VALUES 
  ('pla-plus', 'PLA+', '🧩', 'Fast, dependable, and ideal for prototypes or display pieces.', 1.24, 2.80, 180.00, 1.00, 'Concept models and presentation parts', 
   '{"strength": "Medium", "flexibility": "Low", "tempResistance": "Low", "difficulty": "Easy"}',
   '[{"name": "Arctic White", "hex": "#f3f4f6"}, {"name": "Graphite", "hex": "#1f2937"}, {"name": "Signal Orange", "hex": "#ff5c1a"}]'),
  ('abs', 'ABS', '⚙️', 'A durable engineering plastic for stronger functional parts.', 1.04, 4.10, 210.00, 1.20, 'Enclosures, brackets, workshop fixtures',
   '{"strength": "High", "flexibility": "Medium", "tempResistance": "High", "difficulty": "Advanced"}',
   '[{"name": "Industrial Black", "hex": "#111827"}, {"name": "Slate Gray", "hex": "#4b5563"}, {"name": "Safety Yellow", "hex": "#facc15"}]')
ON CONFLICT (id) DO NOTHING;
```

## Steps to Deploy:

1. **Add environment variables** in Vercel (as listed above)
2. **Run the SQL** in Supabase SQL Editor
3. **Deploy** - Push to Git and Vercel will auto-deploy
4. **Verify** - Visit `/admin/materials` to add more materials

## Troubleshooting:

### "Missing SUPABASE_SERVICE_ROLE_KEY"
- Make sure you added the variable in Vercel project settings
- Redeploy after adding variables (they don't apply to ongoing builds)
- Check that the variable name is exactly: `SUPABASE_SERVICE_ROLE_KEY`

### Still having issues?
Check that your API routes (`/api/materials/route.ts`) can access the environment variable:
```bash
echo $SUPABASE_SERVICE_ROLE_KEY
```
