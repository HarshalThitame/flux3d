-- WhatsApp knowledge vector index optimization

CREATE INDEX IF NOT EXISTS idx_whatsapp_knowledge_chunks_embedding_hnsw
  ON public.whatsapp_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WHERE active = true AND embedding IS NOT NULL;
