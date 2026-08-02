-- Extend admin_audit_logs target_type CHECK to include link_request
ALTER TABLE public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_target_type_check;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_target_type_check
    CHECK (target_type IN (
      'order', 'user', 'material', 'coupon', 'setting',
      'payment', 'refund', 'printer', 'quote', 'manufacturing', 'admin_user',
      'whatsapp_knowledge', 'link_request'
    ));

-- TTL cleanup for expired, unconfirmed link requests
CREATE OR REPLACE FUNCTION public.cleanup_link_requests(p_max_age_hours INTEGER DEFAULT 24)
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.link_requests
  WHERE confirmed_at IS NULL
    AND expires_at < NOW() - (p_max_age_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_link_requests(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_link_requests(INTEGER) TO service_role;