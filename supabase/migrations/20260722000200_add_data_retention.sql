-- Data retention policies for WhatsApp tables

-- 1. Update session cleanup to accept configurable retention
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_sessions(
  p_retention_hours INT DEFAULT 24
)
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.whatsapp_sessions
  WHERE last_active < NOW() - (p_retention_hours || ' hours')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_whatsapp_sessions(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_whatsapp_sessions(INT) TO service_role;

-- 2. Audit cleanup RPC (90-day retention by default)
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_rag_audits(
  p_retention_days INT DEFAULT 90
)
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.whatsapp_rag_answer_audits
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_whatsapp_rag_audits(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_whatsapp_rag_audits(INT) TO service_role;

-- 3. Archive table for audit records older than retention period
CREATE TABLE IF NOT EXISTS public.whatsapp_rag_audits_archive (
  id UUID PRIMARY KEY,
  webhook_event_id UUID,
  sender TEXT,
  user_id UUID,
  question_text TEXT NOT NULL,
  retrieval_mode TEXT NOT NULL,
  retrieval_confidence NUMERIC(5, 4) NOT NULL DEFAULT 0,
  retrieval_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_kind TEXT NOT NULL DEFAULT 'fallback',
  response_text TEXT,
  response_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback_reason TEXT,
  model_name TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'whatsapp-rag-v1',
  latency_ms INTEGER,
  retrieval_latency_ms INTEGER,
  generation_latency_ms INTEGER,
  session_history_length INTEGER,
  structured_data_matches INTEGER,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rag_audits_archive_archived_at
  ON public.whatsapp_rag_audits_archive(archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_audits_archive_sender
  ON public.whatsapp_rag_audits_archive(sender);

ALTER TABLE public.whatsapp_rag_audits_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_rag_audits_archive_service_role_full_access" ON public.whatsapp_rag_audits_archive;
CREATE POLICY "whatsapp_rag_audits_archive_service_role_full_access" ON public.whatsapp_rag_audits_archive
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON TABLE public.whatsapp_rag_audits_archive FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON TABLE public.whatsapp_rag_audits_archive TO service_role;

-- 4. RPC: move records older than retention to archive, then delete from main
CREATE OR REPLACE FUNCTION public.archive_whatsapp_rag_audits(
  p_retention_days INT DEFAULT 90
)
RETURNS TABLE(archived_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.whatsapp_rag_audits_archive
  SELECT
    id, webhook_event_id, sender, user_id, question_text,
    retrieval_mode, retrieval_confidence, retrieval_sources,
    response_kind, response_text, response_metadata,
    fallback_reason, model_name, prompt_version,
    latency_ms, retrieval_latency_ms, generation_latency_ms,
    session_history_length, structured_data_matches,
    NOW(), created_at
  FROM public.whatsapp_rag_answer_audits
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  DELETE FROM public.whatsapp_rag_answer_audits
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_whatsapp_rag_audits(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_whatsapp_rag_audits(INT) TO service_role;
