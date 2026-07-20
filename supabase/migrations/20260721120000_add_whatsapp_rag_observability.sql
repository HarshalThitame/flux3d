-- WhatsApp RAG hardening for Flux3D assistant

DROP TRIGGER IF EXISTS update_whatsapp_knowledge_chunks_updated_at ON public.whatsapp_knowledge_chunks;
CREATE TRIGGER update_whatsapp_knowledge_chunks_updated_at
  BEFORE UPDATE ON public.whatsapp_knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.match_whatsapp_knowledge_chunks(
  query_embedding text,
  match_threshold double precision DEFAULT 0.55,
  match_count integer DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  source_key text,
  title text,
  content text,
  tags text[],
  priority integer,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    q.id,
    q.source_key,
    q.title,
    q.content,
    q.tags,
    q.priority,
    q.active,
    q.created_at,
    q.updated_at,
    1 - (q.embedding <=> query_embedding::vector(1536)) AS similarity
  FROM public.whatsapp_knowledge_chunks AS q
  WHERE q.active = true
    AND q.embedding IS NOT NULL
    AND 1 - (q.embedding <=> query_embedding::vector(1536)) >= match_threshold
  ORDER BY q.embedding <=> query_embedding::vector(1536) ASC, q.priority DESC, q.updated_at DESC
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_whatsapp_knowledge_chunks(text, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_whatsapp_knowledge_chunks(text, double precision, integer) TO service_role;
