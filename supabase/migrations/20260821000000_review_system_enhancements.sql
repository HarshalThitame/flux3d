-- ============================================================================
-- Review System Enhancements
-- ============================================================================

-- Add updated_at to shelf_reviews for edit tracking
ALTER TABLE public.shelf_reviews
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add admin reply fields to shelf_reviews
ALTER TABLE public.shelf_reviews
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_replied_at TIMESTAMPTZ;

-- Create review votes table for helpfulness voting
CREATE TABLE IF NOT EXISTS public.shelf_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.shelf_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Indexes for review votes
CREATE INDEX IF NOT EXISTS idx_shelf_review_votes_review_id
  ON public.shelf_review_votes(review_id);

CREATE INDEX IF NOT EXISTS idx_shelf_review_votes_user_id
  ON public.shelf_review_votes(user_id);

-- Trigger to auto-update updated_at on shelf_reviews
CREATE OR REPLACE FUNCTION public.update_shelf_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_shelf_reviews_updated_at ON public.shelf_reviews;
CREATE TRIGGER set_shelf_reviews_updated_at
  BEFORE UPDATE ON public.shelf_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shelf_reviews_updated_at();

-- RLS for review votes
ALTER TABLE public.shelf_review_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "shelf_review_votes_public_read"
    ON public.shelf_review_votes
    FOR SELECT
    TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "shelf_review_votes_insert_own"
    ON public.shelf_review_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "shelf_review_votes_delete_own"
    ON public.shelf_review_votes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "shelf_review_votes_service_role_full_access"
    ON public.shelf_review_votes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================================================
-- Review Reminder System
-- ============================================================================

-- Track delivery timestamp for shop orders
ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Trigger to auto-set delivered_at when fulfilment_status becomes 'delivered'
CREATE OR REPLACE FUNCTION public.set_shelf_order_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fulfilment_status = 'delivered' AND OLD.fulfilment_status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_shelf_order_delivered_at ON public.shelf_orders;
CREATE TRIGGER trigger_set_shelf_order_delivered_at
  BEFORE UPDATE ON public.shelf_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_shelf_order_delivered_at();

-- Table to track sent review reminders per order
CREATE TABLE IF NOT EXISTS public.shelf_review_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shelf_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_number INTEGER NOT NULL CHECK (reminder_number IN (1, 2, 3)),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, reminder_number)
);

CREATE INDEX IF NOT EXISTS idx_shelf_review_reminders_order_id
  ON public.shelf_review_reminders(order_id);

CREATE INDEX IF NOT EXISTS idx_shelf_review_reminders_user_id
  ON public.shelf_review_reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_shelf_review_reminders_sent_at
  ON public.shelf_review_reminders(sent_at);

ALTER TABLE public.shelf_review_reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "shelf_review_reminders_service_role_full_access"
    ON public.shelf_review_reminders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
