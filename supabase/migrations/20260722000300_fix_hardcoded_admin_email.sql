-- Replace hardcoded admin email RLS policies with is_admin() function
-- These early migrations used 'admin@flux3d.com' which is a security risk

-- Fix materials table policies (from 001_create_materials.sql)
DROP POLICY IF EXISTS "Admin can manage materials" ON public.materials;
CREATE POLICY "Admin can manage materials" ON public.materials
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix blog policies (from 003_create_blog_system.sql)
DROP POLICY IF EXISTS "Admin can manage blog categories" ON public.blog_categories;
CREATE POLICY "Admin can manage blog categories" ON public.blog_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admin can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Blog posts are publicly readable if published" ON public.blog_posts;
CREATE POLICY "Blog posts are publicly readable if published" ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_admin());

-- Fix blog SEO policies (from 021_blog_seo_upgrade.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_seo') THEN
    DROP POLICY IF EXISTS "Admin can manage blog SEO entries" ON public.blog_seo;
    CREATE POLICY "Admin can manage blog SEO entries" ON public.blog_seo
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;
