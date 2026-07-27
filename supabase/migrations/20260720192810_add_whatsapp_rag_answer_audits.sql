-- WhatsApp RAG answer audit trail

CREATE TABLE IF NOT EXISTS public.whatsapp_rag_answer_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id UUID REFERENCES public.whatsapp_webhook_events(id) ON DELETE SET NULL,
  sender TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  retrieval_mode TEXT NOT NULL DEFAULT 'none' CHECK (retrieval_mode IN ('database', 'seed', 'none')),
  retrieval_confidence NUMERIC(5, 4) NOT NULL DEFAULT 0,
  retrieval_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_kind TEXT NOT NULL DEFAULT 'fallback' CHECK (response_kind IN ('model', 'fallback', 'error')),
  response_text TEXT,
  response_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback_reason TEXT,
  model_name TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'whatsapp-rag-v1',
  latency_ms INTEGER,
  retrieval_latency_ms INTEGER,
  generation_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_rag_answer_audits_created_at
  ON public.whatsapp_rag_answer_audits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_rag_answer_audits_sender
  ON public.whatsapp_rag_answer_audits(sender);

CREATE INDEX IF NOT EXISTS idx_whatsapp_rag_answer_audits_webhook_event_id
  ON public.whatsapp_rag_answer_audits(webhook_event_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_rag_answer_audits_model_name
  ON public.whatsapp_rag_answer_audits(model_name);

ALTER TABLE public.whatsapp_rag_answer_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_rag_answer_audits_service_role_full_access" ON public.whatsapp_rag_answer_audits;
CREATE POLICY "whatsapp_rag_answer_audits_service_role_full_access" ON public.whatsapp_rag_answer_audits
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON TABLE public.whatsapp_rag_answer_audits FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_rag_answer_audits TO service_role;
