-- Create blog-images storage bucket for blog post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for blog-images bucket
CREATE POLICY "Public can view blog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated can upload blog images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Service role can manage blog images" ON storage.objects
  FOR ALL USING (bucket_id = 'blog-images');
