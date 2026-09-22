-- Migration: 20260923030000_fix_reviews_status_constraint.sql
-- The original table constraint expected 'pending_review' but the new application
-- code and unified system use 'pending'.

UPDATE public.reviews 
SET status = 'pending' 
WHERE status = 'pending_review';

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_status_check;

ALTER TABLE public.reviews ADD CONSTRAINT reviews_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected'));
