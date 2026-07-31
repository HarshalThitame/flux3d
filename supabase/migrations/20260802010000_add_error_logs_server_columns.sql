-- Add server-side error log columns used by Meta catalog sync, cron syncs, and integrations.
-- Existing columns: user_id, page_url, error_message, stack_trace, device_info, occurred_at.
ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_error_logs_source_created_at ON public.error_logs (source, created_at DESC);
