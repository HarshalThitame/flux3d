-- WhatsApp RAG table permissions for service-role server access

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_knowledge_chunks TO service_role;
