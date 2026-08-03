-- Self-healing RPC for the payment webhook retry cron.
-- Fetches payment events that were ingested but never successfully processed
-- (or failed), up to p_max_retries, respecting a cooldown so we don't hammer
-- a failing gateway. Used by /api/cron/retry-payment-events.

CREATE OR REPLACE FUNCTION public.get_retryable_payment_events(
  p_max_retries INT DEFAULT 3,
  p_cooldown_minutes INT DEFAULT 5,
  p_batch_size INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  event_type TEXT,
  provider_event_id TEXT,
  provider_order_id TEXT,
  provider_payment_id TEXT,
  retry_count INT,
  processing_error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.event_type,
    e.provider_event_id,
    e.provider_order_id,
    e.provider_payment_id,
    e.retry_count,
    e.processing_error
  FROM public.payment_events e
  WHERE e.processing_status IN ('received', 'failed')
    AND e.retry_count < p_max_retries
    AND (
      e.processed_at IS NULL
      OR e.received_at < NOW() - (p_cooldown_minutes || ' minutes')::INTERVAL
    )
  ORDER BY e.retry_count ASC, e.received_at ASC
  LIMIT p_batch_size;
END;
$$;

REVOKE ALL ON FUNCTION public.get_retryable_payment_events(INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_retryable_payment_events(INT, INT, INT) TO service_role;
