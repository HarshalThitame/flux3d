-- Add missing business_settings columns that the code references
-- but were not created by previous migrations.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS razorpay_key_id text,
  ADD COLUMN IF NOT EXISTS razorpay_environment text,
  ADD COLUMN IF NOT EXISTS razorpay_checkout_name text,
  ADD COLUMN IF NOT EXISTS razorpay_checkout_description text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_methods text,
  ADD COLUMN IF NOT EXISTS razorpay_timeout_minutes integer,
  ADD COLUMN IF NOT EXISTS razorpay_order_buffer_minutes integer,
  ADD COLUMN IF NOT EXISTS razorpay_webhook_healthy boolean,
  ADD COLUMN IF NOT EXISTS razorpay_last_connection_check_at text,
  ADD COLUMN IF NOT EXISTS razorpay_last_connection_status text,
  ADD COLUMN IF NOT EXISTS razorpay_last_connection_message text,
  ADD COLUMN IF NOT EXISTS razorpay_refund_permission_mode text,
  ADD COLUMN IF NOT EXISTS razorpay_display_name text,
  ADD COLUMN IF NOT EXISTS razorpay_display_description text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_method_preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS razorpay_checkout_timeout_seconds integer,
  ADD COLUMN IF NOT EXISTS razorpay_refunds_enabled boolean,
  ADD COLUMN IF NOT EXISTS payment_timeout_seconds integer,
  ADD COLUMN IF NOT EXISTS payment_retry_message text,
  ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'razorpay';
