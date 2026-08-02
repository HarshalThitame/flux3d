-- Add the whatsapp_messages_sent counter column to profiles.
-- The WhatsApp webhook increments this per replied message; the column was
-- referenced in code but never created (PostgREST 42703 on every lookup).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_messages_sent INTEGER NOT NULL DEFAULT 0;
