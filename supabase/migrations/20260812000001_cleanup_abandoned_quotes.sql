-- ============================================================================
-- Migration: Cleanup abandoned quote model files
-- Purpose: Add RPC to find model files uploaded for quotes that were never
--          converted to orders, beyond a configurable retention period.
--          This prevents storage bloat from abandoned quote uploads.
-- ============================================================================

-- Add configurable retention setting to business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS cleanup_abandoned_quote_days INTEGER DEFAULT 7;

-- RPC: Find model_files with status 'quoted' (never ordered) that are older
-- than the retention period. Returns the storage paths so the caller can
-- delete both the storage objects and the DB rows atomically.
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_quotes(
  p_retention_days INT DEFAULT 7
)
RETURNS TABLE(
  file_url TEXT,
  size BIGINT,
  uploaded_at TIMESTAMPTZ,
  quote_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mf.file_url::TEXT,
    COALESCE(o.metadata->>'size', '0')::BIGINT,
    mf.uploaded_at,
    q.quote_id::TEXT
  FROM public.model_files mf
  LEFT JOIN storage.objects o
    ON o.name = mf.file_url
    AND o.bucket_id = 'quote-models'
  LEFT JOIN public.quotes q
    ON q.file_path = mf.file_url
  WHERE mf.status = 'quoted'
    AND mf.uploaded_at < NOW() - (p_retention_days || ' days')::INTERVAL;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_abandoned_quotes(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_abandoned_quotes(INT) TO service_role;

-- RPC: Find quote rows whose file_path was never converted into an order
-- (i.e. no orders reference that file_url). These are the quote metadata
-- rows that accompany abandoned uploads.
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_quote_rows(
  p_retention_days INT DEFAULT 7
)
RETURNS TABLE(
  quote_id TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.quote_id::TEXT,
    q.file_path::TEXT,
    q.created_at
  FROM public.quotes q
  WHERE q.file_path IS NOT NULL
    AND q.file_path <> ''
    AND q.created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM public.orders ord
      WHERE ord.file_url = q.file_path
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.model_files mf
      WHERE mf.file_url = q.file_path
      AND mf.status = 'ordered'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_abandoned_quote_rows(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_abandoned_quote_rows(INT) TO service_role;
