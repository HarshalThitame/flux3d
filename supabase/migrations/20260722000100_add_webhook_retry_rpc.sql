-- RPC to increment retry_count and record last error for failed webhook events
-- Called from the catch block in processIncomingMessage when processing fails

CREATE OR REPLACE FUNCTION public.increment_webhook_retry(
  p_event_id UUID,
  p_error TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whatsapp_webhook_events
  SET
    retry_count = retry_count + 1,
    last_error = p_error,
    last_retried_at = NOW()
  WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_webhook_retry(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_webhook_retry(UUID, TEXT) TO service_role;

-- RPC for the retry cron: fetch events that need retrying
CREATE OR REPLACE FUNCTION public.get_retryable_webhook_events(
  p_max_retries INT DEFAULT 3,
  p_cooldown_minutes INT DEFAULT 5,
  p_batch_size INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  payload JSONB,
  sender TEXT,
  payload_hash TEXT,
  retry_count INT,
  last_error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.payload,
    e.sender,
    e.payload_hash,
    e.retry_count,
    e.last_error
  FROM public.whatsapp_webhook_events e
  WHERE e.processed_at IS NULL
    AND e.retry_count < p_max_retries
    AND (
      e.last_retried_at IS NULL
      OR e.last_retried_at < NOW() - (p_cooldown_minutes || ' minutes')::INTERVAL
    )
  ORDER BY e.retry_count ASC, e.created_at ASC
  LIMIT p_batch_size;
END;
$$;

REVOKE ALL ON FUNCTION public.get_retryable_webhook_events(INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_retryable_webhook_events(INT, INT, INT) TO service_role;
