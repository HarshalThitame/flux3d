-- Performance optimization for whatsapp_messages table
-- BRIN index for efficient time-range queries on created_at
-- (more space-efficient than B-tree for append-only time-series data)

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at_brin
  ON public.whatsapp_messages USING brin(created_at)
  WITH (pages_per_range = 32);

-- Also add sender index for admin inbox queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender_created
  ON public.whatsapp_messages(sender, created_at DESC);
