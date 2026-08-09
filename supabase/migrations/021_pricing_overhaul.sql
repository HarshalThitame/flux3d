-- Migration 021: instant-quote pricing overhaul for Indian market + Bambu Lab A2.
-- Adds minimum order value + GST-inclusive display controls and recalibrates
-- default pricing parameters that were inflating quotes.

ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS minimum_order_value numeric(10,2) NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS gst_inclusive_pricing boolean NOT NULL DEFAULT true;

-- Recalibrate defaults for Bambu Lab A2 throughput and competitive Indian pricing.
UPDATE business_settings
SET
  print_speed_grams_per_hour = 40,
  overhead_percent = 10,
  margin_percentage = 20,
  material_markup_percent = 0,
  delivery_charge_threshold = 349,
  post_processing_multipliers = '{"none":0,"sanded":0.15,"sanded-painted":0.35}'::jsonb,
  minimum_order_value = 100,
  gst_inclusive_pricing = true
WHERE deleted_at IS NULL;