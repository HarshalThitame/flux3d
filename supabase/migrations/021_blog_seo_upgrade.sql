-- SEO upgrade for the admin blog editor and public blog pages.

CREATE TABLE IF NOT EXISTS public.authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  profile_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors are publicly readable"
  ON public.authors
  FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage authors"
  ON public.authors
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@flux3d.com');

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS focus_keyword TEXT,
  ADD COLUMN IF NOT EXISTS secondary_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS og_title TEXT,
  ADD COLUMN IF NOT EXISTS og_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_card_type TEXT DEFAULT 'summary_large_image',
  ADD COLUMN IF NOT EXISTS schema_type TEXT DEFAULT 'Article',
  ADD COLUMN IF NOT EXISTS schema_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.authors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS toc_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_image_alt TEXT;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_schema_type_check
  CHECK (schema_type IN ('Article', 'HowTo', 'FAQ', 'Review', 'Product', 'LocalBusiness')) NOT VALID;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_language_check
  CHECK (language IN ('en', 'hi', 'mr')) NOT VALID;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_twitter_card_type_check
  CHECK (twitter_card_type IN ('summary', 'summary_large_image')) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug_unique ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_last_modified_at ON public.blog_posts(last_modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

INSERT INTO public.authors (name, bio, photo_url, linkedin_url, twitter_url, profile_url)
SELECT
  'Flux3D Team',
  'Flux3D experts writing about 3D printing, rapid prototyping, materials, and manufacturing workflows.',
  '/logo.png',
  NULL,
  NULL,
  'https://flux3d.in/about'
WHERE NOT EXISTS (
  SELECT 1 FROM public.authors WHERE name = 'Flux3D Team'
);

UPDATE public.blog_posts
SET
  seo_title = COALESCE(seo_title, title),
  meta_description = COALESCE(meta_description, excerpt),
  og_title = COALESCE(og_title, seo_title, title),
  og_description = COALESCE(og_description, meta_description, excerpt),
  og_image_url = COALESCE(og_image_url, featured_image),
  canonical_url = COALESCE(canonical_url, 'https://flux3d.in/blog/' || slug),
  schema_type = COALESCE(schema_type, 'Article'),
  schema_data = COALESCE(schema_data, '{}'::jsonb),
  secondary_keywords = COALESCE(secondary_keywords, '{}'::text[]),
  twitter_card_type = COALESCE(twitter_card_type, 'summary_large_image'),
  reading_time_minutes = GREATEST(1, COALESCE(reading_time_minutes, read_time, 1)),
  word_count = COALESCE(word_count, 0),
  last_modified_at = COALESCE(last_modified_at, updated_at, NOW()),
  toc_enabled = COALESCE(toc_enabled, TRUE),
  language = COALESCE(language, 'en'),
  seo_score = COALESCE(seo_score, 0);

CREATE OR REPLACE FUNCTION public.update_author_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_authors_updated_at ON public.authors;
CREATE TRIGGER update_authors_updated_at
  BEFORE UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_updated_at();

CREATE OR REPLACE FUNCTION public.update_blog_post_seo_fields()
RETURNS TRIGGER AS $$
DECLARE
  content_text TEXT;
  computed_word_count INTEGER;
BEGIN
  content_text := regexp_replace(COALESCE(NEW.content, ''), '<[^>]+>', ' ', 'g');
  content_text := regexp_replace(content_text, '\s+', ' ', 'g');
  computed_word_count := COALESCE(array_length(regexp_split_to_array(trim(content_text), '\s+'), 1), 0);

  NEW.word_count = computed_word_count;
  NEW.reading_time_minutes = GREATEST(1, CEIL(computed_word_count / 200.0)::INTEGER);
  NEW.read_time = NEW.reading_time_minutes;
  NEW.last_modified_at = NOW();
  NEW.updated_at = NOW();

  IF NEW.slug IS NOT NULL AND COALESCE(NEW.canonical_url, '') = '' THEN
    NEW.canonical_url = 'https://flux3d.in/blog/' || NEW.slug;
  END IF;

  IF COALESCE(NEW.og_title, '') = '' THEN
    NEW.og_title = COALESCE(NEW.seo_title, NEW.title);
  END IF;

  IF COALESCE(NEW.og_description, '') = '' THEN
    NEW.og_description = COALESCE(NEW.meta_description, NEW.excerpt);
  END IF;

  IF COALESCE(NEW.og_image_url, '') = '' THEN
    NEW.og_image_url = NEW.featured_image;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_blog_post_seo_fields ON public.blog_posts;
CREATE TRIGGER update_blog_post_seo_fields
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_post_seo_fields();
