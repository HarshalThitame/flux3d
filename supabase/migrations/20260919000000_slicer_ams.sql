-- orders: slicer & AMS columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_multicolor       boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ams_color_count     integer      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS slicer_weight_grams numeric(10,2)         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slicer_time_minutes integer               DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ams_surcharge       numeric(10,2) NOT NULL DEFAULT 0;

-- business_settings: slicer configuration
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS ams_color_change_surcharge numeric(10,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS slicer_service_url          text          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS slicer_service_enabled      boolean       NOT NULL DEFAULT false;
