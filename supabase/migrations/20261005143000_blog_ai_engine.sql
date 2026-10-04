-- Production-grade AI blog automation. Existing posts remain intact.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS topic_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS topic_category TEXT,
  ADD COLUMN IF NOT EXISTS ai_topic_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS research_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS seo_quality_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS uniqueness_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS readability_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS generation_id UUID,
  ADD COLUMN IF NOT EXISTS topic_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_blog_posts_topic_fingerprint
  ON public.blog_posts(topic_fingerprint);
CREATE INDEX IF NOT EXISTS idx_blog_posts_ai_generated
  ON public.blog_posts(ai_generated, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_topic_embedding_hnsw
  ON public.blog_posts USING hnsw (topic_embedding vector_cosine_ops)
  WHERE topic_embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_blog_topic_embeddings(
  query_embedding vector(1536),
  match_limit INTEGER DEFAULT 5
)
RETURNS TABLE (id UUID, similarity DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT blog_posts.id, 1 - (blog_posts.topic_embedding <=> query_embedding) AS similarity
  FROM public.blog_posts
  WHERE blog_posts.topic_embedding IS NOT NULL
    AND blog_posts.status IN ('draft', 'published')
  ORDER BY blog_posts.topic_embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_limit, 1), 20);
$$;

REVOKE ALL ON FUNCTION public.match_blog_topic_embeddings(vector, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_blog_topic_embeddings(vector, INTEGER) TO service_role;

CREATE TABLE IF NOT EXISTS public.blog_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_key TEXT NOT NULL UNIQUE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual_auto', 'manual_custom', 'retry')),
  status TEXT NOT NULL CHECK (status IN ('researching', 'generating', 'validating', 'draft', 'published', 'failed')),
  requested_topic TEXT,
  selected_topic TEXT,
  selected_candidate JSONB,
  research_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  blog_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  model TEXT,
  error_message TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_generation_runs_status_created
  ON public.blog_generation_runs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_generation_runs_blog_id
  ON public.blog_generation_runs(blog_id);

CREATE TABLE IF NOT EXISTS public.blog_ai_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_publish BOOLEAN NOT NULL DEFAULT TRUE,
  schedule_days INTEGER[] NOT NULL DEFAULT ARRAY[1,3,6],
  schedule_time TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  default_author_id UUID REFERENCES public.authors(id) ON DELETE SET NULL,
  default_author_name TEXT NOT NULL DEFAULT 'Flux3D Team',
  target_min_words INTEGER NOT NULL DEFAULT 1200 CHECK (target_min_words >= 600),
  target_max_words INTEGER NOT NULL DEFAULT 2000 CHECK (target_max_words >= target_min_words),
  minimum_quality_score NUMERIC(5,2) NOT NULL DEFAULT 72,
  minimum_uniqueness_score NUMERIC(5,2) NOT NULL DEFAULT 72,
  preferred_categories TEXT[] NOT NULL DEFAULT '{}',
  excluded_topics TEXT[] NOT NULL DEFAULT '{}',
  cta_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  generation_model TEXT,
  research_model TEXT,
  last_successful_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.blog_ai_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.blog_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage blog generation runs" ON public.blog_generation_runs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin can manage blog AI settings" ON public.blog_ai_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_blog_generation_runs_updated_at ON public.blog_generation_runs;
CREATE TRIGGER update_blog_generation_runs_updated_at
  BEFORE UPDATE ON public.blog_generation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_ai_settings_updated_at ON public.blog_ai_settings;
CREATE TRIGGER update_blog_ai_settings_updated_at
  BEFORE UPDATE ON public.blog_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
