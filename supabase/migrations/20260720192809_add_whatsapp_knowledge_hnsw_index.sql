-- WhatsApp knowledge vector index optimization
-- Wrapped in conditional because whatsapp_knowledge_chunks table is created
-- in a later migration (20260721000000_add_whatsapp_knowledge_rag.sql).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'whatsapp_knowledge_chunks'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_whatsapp_knowledge_chunks_embedding_hnsw
      ON public.whatsapp_knowledge_chunks
      USING hnsw (embedding vector_cosine_ops)
      WHERE active = true AND embedding IS NOT NULL;
  END IF;
END $$;
