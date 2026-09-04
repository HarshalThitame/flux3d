-- ============================================================================
-- Migration: WhatsApp Message Parity — Full Cloud API Support
-- Date: 2026-09-06
-- Purpose:
--   1. Add columns for context/reply-to, metadata, thumbnails, forwarded flag,
--      and interactive payload to whatsapp_messages
--   2. Create whatsapp_message_reactions table for per-reactor emoji history
--   3. Widen media_type CHECK constraint for new message types
--   4. Update the idempotent insert RPC with new columns
-- ============================================================================

-- 1. New columns on whatsapp_messages (all nullable with safe defaults —
--    Postgres instant ADD for nullable columns, no table lock)
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS context_message_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS interactive_payload JSONB;

-- Index for looking up quoted messages by meta_message_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_context_msg
  ON public.whatsapp_messages(context_message_id)
  WHERE context_message_id IS NOT NULL;

-- 2. Reactions table (per-reactor, supports emoji changes/removals via UPSERT)
CREATE TABLE IF NOT EXISTS public.whatsapp_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_meta_id TEXT NOT NULL,   -- the wamid of the message being reacted to
  reactor_phone TEXT NOT NULL,     -- phone number of the person reacting
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_meta_id, reactor_phone)
);

CREATE INDEX IF NOT EXISTS idx_reactions_meta_id
  ON public.whatsapp_message_reactions(message_meta_id);

ALTER TABLE public.whatsapp_message_reactions ENABLE ROW LEVEL SECURITY;

-- Service role: full CRUD
DROP POLICY IF EXISTS "reactions_service_role" ON public.whatsapp_message_reactions;
CREATE POLICY "reactions_service_role"
  ON public.whatsapp_message_reactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin read access for the inbox
DROP POLICY IF EXISTS "reactions_admin_select" ON public.whatsapp_message_reactions;
CREATE POLICY "reactions_admin_select"
  ON public.whatsapp_message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. Widen media_type CHECK constraint to allow new message types
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_media_type_check;
ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_media_type_check
  CHECK (media_type IS NULL OR media_type IN (
    'image', 'document', 'audio', 'video', 'sticker', 'stl',
    'template', 'order', 'interactive', 'location', 'contacts', 'reaction'
  ));

-- 4. Update the idempotent insert RPC with new columns
CREATE OR REPLACE FUNCTION insert_whatsapp_message_if_not_exists(
  p_user_id UUID DEFAULT NULL,
  p_sender TEXT DEFAULT NULL,
  p_direction TEXT DEFAULT 'incoming',
  p_message_text TEXT DEFAULT NULL,
  p_automated BOOLEAN DEFAULT false,
  p_trigger_event TEXT DEFAULT NULL,
  p_responded BOOLEAN DEFAULT false,
  p_response_time_minutes INTEGER DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL,
  p_media_url TEXT DEFAULT NULL,
  p_media_filename TEXT DEFAULT NULL,
  p_media_mime_type TEXT DEFAULT NULL,
  p_media_size_bytes BIGINT DEFAULT NULL,
  p_meta_message_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'sent',
  p_context_message_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_is_forwarded BOOLEAN DEFAULT false,
  p_interactive_payload JSONB DEFAULT NULL,
  p_media_thumbnail_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Skip if this exact meta_message_id already exists (idempotency)
  IF p_meta_message_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.whatsapp_messages
    WHERE meta_message_id = p_meta_message_id LIMIT 1;
    IF FOUND THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO public.whatsapp_messages (
    user_id, sender, direction, message_text, automated, trigger_event,
    responded, response_time_minutes, media_type, media_url, media_filename,
    media_mime_type, media_size_bytes, meta_message_id, status,
    context_message_id, metadata, is_forwarded, interactive_payload,
    media_thumbnail_url
  ) VALUES (
    p_user_id, p_sender, p_direction, p_message_text, p_automated, p_trigger_event,
    p_responded, p_response_time_minutes, p_media_type, p_media_url, p_media_filename,
    p_media_mime_type, p_media_size_bytes, p_meta_message_id, p_status,
    p_context_message_id, COALESCE(p_metadata, '{}'::jsonb), p_is_forwarded,
    p_interactive_payload, p_media_thumbnail_url
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
