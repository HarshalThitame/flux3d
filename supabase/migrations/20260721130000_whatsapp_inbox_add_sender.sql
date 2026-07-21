-- Add sender (phone number) column to whatsapp_messages for inbox
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS sender TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender_created_at
  ON public.whatsapp_messages(sender, created_at DESC);
