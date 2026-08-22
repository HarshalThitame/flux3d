-- ============================================================================
-- Migration: Performance indexes for production scale
-- Date: 2026-08-22
-- Purpose:
--   1. Composite status/date indexes on orders for admin dashboards
--   2. Material and post-processing level lookups for quote matching
--   3. Invoice number lookup on shelf_orders
--   4. WhatsApp conversation query support
--   5. Support ticket lookups by last message timestamp
-- ============================================================================

-- Orders: admin status filters are commonly combined with created_at ranges
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON public.orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at
  ON public.orders(user_id, created_at DESC);

-- Orders: quote matching by material / post-processing level
CREATE INDEX IF NOT EXISTS idx_orders_material
  ON public.orders(material);

CREATE INDEX IF NOT EXISTS idx_orders_post_processing_level
  ON public.orders(post_processing_level);

-- Shelf orders: invoice lookup and status/date dashboards
CREATE INDEX IF NOT EXISTS idx_shelf_orders_invoice_number
  ON public.shelf_orders(invoice_number);

CREATE INDEX IF NOT EXISTS idx_shelf_orders_status_placed_at
  ON public.shelf_orders(order_status, placed_at DESC);

-- WhatsApp messages: inbox conversation listing groups by sender
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender_created_at
  ON public.whatsapp_messages(sender, created_at DESC);

-- WhatsApp messages: unread badge queries filter by direction + responded
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction_responded
  ON public.whatsapp_messages(direction, responded, created_at DESC);

-- Support tickets: admin inbox sorts by most recent activity
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message_at_id
  ON public.support_tickets(last_message_at DESC, id);

-- Payment attempts: admin overview filters by status + created_at
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status_created_at
  ON public.payment_attempts(status, created_at DESC);

-- Payment attempts: customer order history lookup
CREATE INDEX IF NOT EXISTS idx_payment_attempts_customer_created_at
  ON public.payment_attempts(customer_id, created_at DESC);