-- Scheduled publishing for shelf_products.
-- Adds published_at, an RPC to flip due products to active, and a pg_cron job.

CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Publishes (is_active = true) every non-archived, inactive product whose
-- published_at has passed. Returns the ids that were just published.
CREATE OR REPLACE FUNCTION public.publish_scheduled_products()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
DECLARE
  product_id uuid;
BEGIN
  FOR product_id IN
    UPDATE public.shelf_products
    SET is_active = true
    WHERE is_archived = false
      AND is_active = false
      AND published_at IS NOT NULL
      AND published_at <= NOW()
    RETURNING id
  LOOP
    RETURN NEXT product_id;
  END LOOP;
  RETURN;
END;
$fn$;

-- Run every minute. Named schedules are upserted by pg_cron, so re-running this
-- migration is safe.
SELECT cron.schedule('publish-scheduled-products', '* * * * *', $$SELECT public.publish_scheduled_products()$$);
