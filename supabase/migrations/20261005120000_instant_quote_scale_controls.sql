-- Configurable uniform scale limits for Instant Quote, plus operational order visibility.
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS quote_scale_min_percent NUMERIC(7,2) NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS quote_scale_max_percent NUMERIC(7,2) NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS quote_scale_default_percent NUMERIC(7,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS quote_scale_step_percent NUMERIC(7,2) NOT NULL DEFAULT 5;

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS business_settings_quote_scale_range_check,
  ADD CONSTRAINT business_settings_quote_scale_range_check CHECK (
    quote_scale_min_percent > 0
    AND quote_scale_max_percent >= quote_scale_min_percent
    AND quote_scale_default_percent BETWEEN quote_scale_min_percent AND quote_scale_max_percent
    AND quote_scale_step_percent > 0
  );

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS scale_percent NUMERIC(7,2) NOT NULL DEFAULT 100,
  DROP CONSTRAINT IF EXISTS orders_scale_percent_positive_check,
  ADD CONSTRAINT orders_scale_percent_positive_check CHECK (scale_percent > 0);
