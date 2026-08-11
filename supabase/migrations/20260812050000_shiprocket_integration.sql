-- Shiprocket fulfilment integration
-- Adds Shiprocket references + tracking events to shelf_orders and a small
-- settings table used to persist the (rotating) Shiprocket API token.

ALTER TABLE public.shelf_orders
  ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT,
  ADD COLUMN IF NOT EXISTS shipment_id BIGINT,
  ADD COLUMN IF NOT EXISTS tracking_events JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.shelf_orders.shiprocket_order_id IS
  'Shiprocket internal order id returned by POST /v1/external/orders/create/adhoc.';
COMMENT ON COLUMN public.shelf_orders.shipment_id IS
  'Shiprocket shipment id used for AWB assignment and pickup scheduling.';
COMMENT ON COLUMN public.shelf_orders.tracking_events IS
  'Append-only Shiprocket shipment status events: [{ date, status, activity, location, label, raw_payload }].';

-- Shiprocket webhook looks orders up by tracking_number (AWB).
CREATE INDEX IF NOT EXISTS idx_shelf_orders_tracking_number
  ON public.shelf_orders(tracking_number);

-- Key/value store for integration state (e.g. Shiprocket auth token).
CREATE TABLE IF NOT EXISTS public.shiprocket_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shiprocket_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shiprocket_settings_service_role_only"
  ON public.shiprocket_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
