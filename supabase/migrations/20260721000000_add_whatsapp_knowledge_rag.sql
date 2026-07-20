-- WhatsApp RAG knowledge base for Flux3D assistant

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.whatsapp_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  priority INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_knowledge_chunks_active_priority
  ON public.whatsapp_knowledge_chunks(active, priority DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_knowledge_chunks_source_key
  ON public.whatsapp_knowledge_chunks(source_key);

ALTER TABLE public.whatsapp_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_knowledge_chunks_service_role_full_access" ON public.whatsapp_knowledge_chunks;
CREATE POLICY "whatsapp_knowledge_chunks_service_role_full_access" ON public.whatsapp_knowledge_chunks
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
