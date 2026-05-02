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

-- Create policy for admin write access (assuming admin users have specific metadata)
CREATE POLICY "Admin can manage materials" 
  ON public.materials 
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() -> 'email' = 'admin@flux3d.com')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON public.materials(created_at DESC);

-- Insert some default materials (optional - can be done via admin panel)
INSERT INTO public.materials (id, name, icon, summary, density, price_per_gram, machine_rate, multiplier, recommended_for, properties, colors)
VALUES 
  ('pla-plus', 'PLA+', '🧩', 'Fast, dependable, and ideal for prototypes or display pieces.', 1.24, 2.80, 180.00, 1.00, 'Concept models and presentation parts', 
   '{"strength": "Medium", "flexibility": "Low", "tempResistance": "Low", "difficulty": "Easy"}',
   '[{"name": "Arctic White", "hex": "#f3f4f6"}, {"name": "Graphite", "hex": "#1f2937"}, {"name": "Signal Orange", "hex": "#ff5c1a"}]'),
  ('abs', 'ABS', '⚙️', 'A durable engineering plastic for stronger functional parts.', 1.04, 4.10, 210.00, 1.20, 'Enclosures, brackets, workshop fixtures',
   '{"strength": "High", "flexibility": "Medium", "tempResistance": "High", "difficulty": "Advanced"}',
   '[{"name": "Industrial Black", "hex": "#111827"}, {"name": "Slate Gray", "hex": "#4b5563"}, {"name": "Safety Yellow", "hex": "#facc15"}]')
ON CONFLICT (id) DO NOTHING;
