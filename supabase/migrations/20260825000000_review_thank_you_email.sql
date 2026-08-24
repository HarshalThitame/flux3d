-- ============================================================================
-- Extend email_logs.email_type CHECK to include review_thank_you
-- (thank-you note sent after a customer submits a product review)
-- ============================================================================

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type = ANY (ARRAY[
    'welcome'::text,
    'email_verification'::text,
    'password_reset'::text,
    'password_changed'::text,
    'order_placed_customer'::text,
    'order_placed_admin'::text,
    'model_validation_pass'::text,
    'model_validation_fail'::text,
    'production_started'::text,
    'order_shipped'::text,
    'delivery_confirmation'::text,
    'review_reminder'::text,
    'review_thank_you'::text,
    'payment_receipt'::text,
    'payment_failed'::text,
    'refund_issued'::text,
    'contact_notification'::text,
    'account_link_confirmation'::text,
    'stock_alert'::text,
    'back_in_stock'::text,
    'ticket_acknowledgment'::text,
    'out_for_delivery'::text,
    'magic_link_login'::text
  ]));
