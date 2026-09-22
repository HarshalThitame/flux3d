-- Force PostgREST schema cache reload by creating a harmless trigger/function change
-- This notifies pgrst to reload its schema cache

-- The standard way to reload PostgREST schema cache is via NOTIFY
-- We create a function and immediately drop it, which triggers a DDL change
-- that PostgREST picks up on its next poll

DO $$
BEGIN
  -- Touch the reviews table metadata to force schema cache refresh
  -- Add a comment then remove it — DDL change triggers pgrst reload
  COMMENT ON TABLE public.reviews IS 'Unified testimonial/review table for all order types';
  COMMENT ON TABLE public.review_links IS 'Secure tokenized links for testimonial collection';
END $$;

-- Explicitly notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
