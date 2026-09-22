-- Migration: 20260923020000_add_missing_reviews_columns.sql
-- The reviews table was pre-existing when migration 20260920220000 ran,
-- so CREATE TABLE IF NOT EXISTS skipped adding the full column set.
-- This migration adds all the columns that were defined in that migration
-- but were never actually created.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS product_id          UUID,
  ADD COLUMN IF NOT EXISTS user_id             UUID,
  ADD COLUMN IF NOT EXISTS customer_name       TEXT,
  ADD COLUMN IF NOT EXISTS title               TEXT,
  ADD COLUMN IF NOT EXISTS body                TEXT,
  ADD COLUMN IF NOT EXISTS image_urls          TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT true;

-- Reload PostgREST schema cache so the API sees the new columns immediately
NOTIFY pgrst, 'reload schema';
