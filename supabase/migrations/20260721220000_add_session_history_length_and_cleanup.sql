-- Add session_history_length column to audit trail
ALTER TABLE public.whatsapp_rag_answer_audits
  ADD COLUMN IF NOT EXISTS session_history_length INTEGER;

-- RPC for cron cleanup of stale sessions
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_sessions()
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.whatsapp_sessions
  WHERE last_active < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN NEXT;
END;
$$;
