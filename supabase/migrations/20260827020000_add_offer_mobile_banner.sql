-- Migration: Add mobile banner image URL to offers table
-- Allows uploading a separate mobile-optimized banner image

ALTER TABLE offers ADD COLUMN IF NOT EXISTS banner_image_mobile_url TEXT;
