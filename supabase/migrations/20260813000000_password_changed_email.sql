-- ============================================================================
-- Extend email_logs.email_type CHECK to include password_changed
-- (security notification sent after a user updates their password)
-- ============================================================================

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'welcome',
    'email_verification',
    'password_reset',
    'password_changed',
    'order_placed_customer',
    'order_placed_admin',
    'model_validation_pass',
    'model_validation_fail',
    'production_started',
    'order_shipped',
    'delivery_confirmation',
    'payment_receipt',
    'payment_failed',
    'refund_issued',
    'contact_notification',
    'account_link_confirmation',
    'stock_alert',
    'back_in_stock'
  ));
