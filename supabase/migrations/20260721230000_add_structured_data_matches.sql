-- Add structured_data_matches column to audit trail for Layer A RAG tracking
ALTER TABLE public.whatsapp_rag_answer_audits
  ADD COLUMN IF NOT EXISTS structured_data_matches INTEGER;
