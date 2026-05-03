-- Create blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_name TEXT NOT NULL DEFAULT 'Flux 3D Team',
  author_avatar TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  read_time INTEGER DEFAULT 5,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Create blog categories table (optional, for better organization)
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#FF5C1A',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for blog_posts
CREATE POLICY "Blog posts are publicly readable if published" 
  ON public.blog_posts 
  FOR SELECT 
  USING (status = 'published' OR auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com');

CREATE POLICY "Admin can manage blog posts" 
  ON public.blog_posts 
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com');

-- Create policies for blog_categories
CREATE POLICY "Blog categories are publicly readable" 
  ON public.blog_categories 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admin can manage blog categories" 
  ON public.blog_categories 
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, color)
VALUES 
  ('3D Printing', '3d-printing', 'Tips, tricks, and insights about 3D printing technology', '#FF5C1A'),
  ('Design Tips', 'design-tips', 'Learn about 3D modeling and design best practices', '#23c483'),
  ('Case Studies', 'case-studies', 'Real-world applications and success stories', '#8b5cf6'),
  ('Technology', 'technology', 'Latest updates in 3D printing technology', '#3498db'),
  ('Tutorials', 'tutorials', 'Step-by-step guides for 3D printing', '#d946ef')
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for blog images (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Set up storage policy for blog-images bucket (run after creating bucket)
-- CREATE POLICY "Blog images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
-- CREATE POLICY "Admin can upload blog images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com'));
-- CREATE POLICY "Admin can update blog images" ON storage.objects FOR UPDATE USING (bucket_id = 'blog-images' AND (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com'));
-- CREATE POLICY "Admin can delete blog images" ON storage.objects FOR DELETE USING (bucket_id = 'blog-images' AND (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com'));
