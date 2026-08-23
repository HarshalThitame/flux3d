-- Shiprocket fulfilment hardening
-- pickup_scheduled_at: set when Shiprocket confirms a pickup slot (enables the
--   admin "Retry Pickup" action when it is null after shipping).
-- shipped_notifications_sent_at: one-shot marker so order-shipped email and
--   WhatsApp notifications are never duplicated on shipment retries.

ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_notifications_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shelf_orders.pickup_scheduled_at IS
  'Timestamp of the first successful Shiprocket pickup scheduling for this order.';
COMMENT ON COLUMN public.shelf_orders.shipped_notifications_sent_at IS
  'One-shot marker: set before sending shipped email/WhatsApp so retries never duplicate customer notifications.';
