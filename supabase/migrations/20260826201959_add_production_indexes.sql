-- Production readiness: add missing indexes for frequent lookups

-- Orders table: phone is used in admin search and WhatsApp lookups
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

-- Quotes table: frequent lookups by user and creation time
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);

-- Shelf orders: phone lookup in shipping_address JSONB for guest order search
CREATE INDEX IF NOT EXISTS idx_shelf_orders_shipping_phone ON shelf_orders((shipping_address->>'phone'));

-- Payment refunds: fast lookup by provider_refund_id for webhook processing
CREATE INDEX IF NOT EXISTS idx_payment_refunds_provider_refund_id ON payment_refunds(provider_refund_id);

-- Payment events: fast lookup by provider_payment_id
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_payment_id ON payment_events(provider_payment_id);
