-- ============================================================================
-- Migration: 20260923000000_testimonial_system_upgrade.sql
-- Enterprise Testimonial System Upgrade
-- ============================================================================

-- 1. Extend review_links with customer prefill data + multi-use support
ALTER TABLE public.review_links
  ADD COLUMN IF NOT EXISTS customer_name  TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS product_name   TEXT,
  ADD COLUMN IF NOT EXISTS used_at        TIMESTAMPTZ;
-- Note: is_used BOOLEAN already exists from prior migration.
-- used_at added for audit trail. Multi-use: we do NOT set either on submit.

-- 2. Extend reviews with email & phone for admin contact/export
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 3. Add configurable WhatsApp testimonial message template to business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS testimonial_whatsapp_template TEXT
    DEFAULT 'Hi {{name}}! 🙏 We''re so glad you chose FLUX3D. Would love to hear your experience — share your testimonial here (takes 2 mins): {{url}}';

-- 4. RLS for review_links
-- Token is a 32-byte hex secret — safe to allow public SELECT by token
ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "review_links_anon_select"
    ON public.review_links
    FOR SELECT
    TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "review_links_service_role_all"
    ON public.review_links
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert testimonials (status must be 'pending')
DO $$ BEGIN
  CREATE POLICY "reviews_anon_insert_pending"
    ON public.reviews
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (status = 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public can only read approved reviews
DO $$ BEGIN
  CREATE POLICY "reviews_anon_read_approved"
    ON public.reviews
    FOR SELECT
    TO anon, authenticated
    USING (status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role has full access for admin operations
DO $$ BEGIN
  CREATE POLICY "reviews_service_role_all"
    ON public.reviews
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_review_links_token ON public.review_links (token);
CREATE INDEX IF NOT EXISTS idx_review_links_order_id ON public.review_links (order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews (order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);
