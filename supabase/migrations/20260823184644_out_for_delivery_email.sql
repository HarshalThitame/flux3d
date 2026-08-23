-- ============================================================================
-- Migration: Out-for-delivery email notification
-- Date: 2026-08-23
-- Purpose:
--   * email_logs.email_type: add 'out_for_delivery'
--   * Seed the system email_templates row (rendered by the dispatcher)
-- Trigger wiring lives in src/app/api/webhooks/fulfilment/route.ts, which
-- fires when Shiprocket reports "Out for Delivery".
-- ============================================================================

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.email_logs'::regclass
    AND contype = 'c'
    AND conname LIKE 'email_logs_email_type%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS %I', cname);
  END IF;

  ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check
    CHECK (email_type IN ('welcome','email_verification','password_reset','password_changed',
      'order_placed_customer','order_placed_admin','model_validation_pass','model_validation_fail',
      'production_started','order_shipped','delivery_confirmation','review_reminder',
      'payment_receipt','payment_failed','refund_issued','contact_notification',
      'account_link_confirmation','stock_alert','back_in_stock','ticket_acknowledgment',
      'out_for_delivery'));
END $$;

INSERT INTO public.email_templates (
  name, email_type, category, subject, html_body, plain_text, variables,
  is_enabled, is_system, description
)
SELECT
  'Order out for delivery',
  'out_for_delivery',
  'transactional',
  'Your order {{order_number}} is out for delivery 🛵',
  '<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Good news — your order <strong>{{order_number}}</strong> is out for delivery and should reach you today.
</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Courier: <strong>{{courier_name}}</strong> · AWB <strong>{{tracking_number}}</strong>
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:8px 0 24px;">
  <a href="{{tracking_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Track your shipment</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Please keep someone available at the delivery address. Questions? <a href="mailto:{{support_email}}" style="color:#39BDF8;">{{support_email}}</a>
</p>',
  'Hi {{customer_name}}, your order {{order_number}} is out for delivery and should arrive today.',
  '["customer_name","order_number","courier_name","tracking_number","tracking_url"]'::jsonb,
  TRUE, TRUE,
  'Sent when the courier marks a shipment as Out for Delivery (Shiprocket webhook).'
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE email_type = 'out_for_delivery' AND is_system = TRUE
);
