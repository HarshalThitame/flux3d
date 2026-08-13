-- Enterprise WhatsApp Inbox Schema Migration

-- 1. Extend whatsapp_messages for Rich Media, Delivery Ticks & Meta Message ID
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'document', 'audio', 'video', 'sticker', 'stl', 'template')),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_filename TEXT,
  ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS media_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS meta_message_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  ADD COLUMN IF NOT EXISTS status_error TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id
  ON public.whatsapp_messages(meta_message_id) WHERE meta_message_id IS NOT NULL;

-- 2. Create Instant Replies / Quick Templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  shortcut TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Internal Admin Notes table
CREATE TABLE IF NOT EXISTS public.whatsapp_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  note_text TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_internal_notes_sender
  ON public.whatsapp_internal_notes(sender, created_at DESC);

-- 4. Create Conversation Tags & Metadata table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_meta (
  sender TEXT PRIMARY KEY,
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  last_customer_message_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_replies_service_role" ON public.whatsapp_quick_replies;
CREATE POLICY "quick_replies_service_role" ON public.whatsapp_quick_replies FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quick_replies_authenticated_select" ON public.whatsapp_quick_replies;
CREATE POLICY "quick_replies_authenticated_select" ON public.whatsapp_quick_replies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "internal_notes_service_role" ON public.whatsapp_internal_notes;
CREATE POLICY "internal_notes_service_role" ON public.whatsapp_internal_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "internal_notes_authenticated_select" ON public.whatsapp_internal_notes;
CREATE POLICY "internal_notes_authenticated_select" ON public.whatsapp_internal_notes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "conversation_meta_service_role" ON public.whatsapp_conversation_meta;
CREATE POLICY "conversation_meta_service_role" ON public.whatsapp_conversation_meta FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "conversation_meta_authenticated_select" ON public.whatsapp_conversation_meta;
CREATE POLICY "conversation_meta_authenticated_select" ON public.whatsapp_conversation_meta FOR SELECT TO authenticated USING (true);

-- Seed default instant reply templates
INSERT INTO public.whatsapp_quick_replies (title, shortcut, content, category)
VALUES
  ('3D File Quote Request', '/quote', 'Hi! Thanks for reaching out to Flux3D. Please share your 3D model file (.STL, .3MF, or .OBJ) along with your preferred material (PLA, ABS, PETG, TPU) and deadline for an instant price estimate.', 'pricing'),
  ('Bank & UPI Payment Details', '/bank', 'Here are our official payment details for order confirmation:\n\nUPI ID: flux3d@upi\nBank Name: HDFC Bank\nA/C Holder: Flux3D Technologies\n\nPlease share the payment screenshot once completed!', 'payment'),
  ('Shipping & Tracking Update', '/tracking', 'Your 3D print order has been packed and dispatched! You can track your courier shipment using your registered order number or email.', 'shipping'),
  ('Print Material Guide', '/materials', 'We offer multiple high-quality 3D printing materials:\n- PLA+: Great for display models & prototypes\n- PETG: High durability & outdoor use\n- ABS/ASA: High temperature & impact resistance\n- TPU (Flexible): Rubber-like flexible prints\n- SLA Resin: Ultra-high detail miniatures.', 'materials')
ON CONFLICT (shortcut) DO NOTHING;
