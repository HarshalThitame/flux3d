-- Fix session save race condition: use SELECT FOR UPDATE inside a transaction
-- so concurrent messages from the same sender don't overwrite each other's history.

CREATE OR REPLACE FUNCTION public.save_whatsapp_session(
  p_phone TEXT,
  p_user_message TEXT,
  p_assistant_reply TEXT,
  p_max_turns INT DEFAULT 4
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing JSONB;
  v_updated JSONB;
  v_msg_count INT;
BEGIN
  -- Lock the row exclusively — second concurrent caller waits here
  SELECT messages INTO v_existing
  FROM public.whatsapp_sessions
  WHERE phone_number = p_phone
  FOR UPDATE;

  v_updated := COALESCE(v_existing, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('role', 'user', 'content', p_user_message),
    jsonb_build_object('role', 'assistant', 'content', p_assistant_reply)
  );

  v_msg_count := jsonb_array_length(v_updated);

  -- Keep only the last p_max_turns user+assistant pairs
  IF v_msg_count > p_max_turns * 2 THEN
    v_updated := (
      SELECT jsonb_agg(elem) FROM (
        SELECT elem FROM jsonb_array_elements(v_updated) WITH ORDINALITY AS t(elem, idx)
        ORDER BY idx
        LIMIT p_max_turns * 2
        OFFSET v_msg_count - (p_max_turns * 2)
      ) sub
    );
  END IF;

  INSERT INTO public.whatsapp_sessions (phone_number, messages, last_active)
  VALUES (p_phone, v_updated, NOW())
  ON CONFLICT (phone_number)
  DO UPDATE SET messages = v_updated, last_active = NOW();
END;
$$;

-- Grant execute to service_role
REVOKE ALL ON FUNCTION public.save_whatsapp_session(TEXT, TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_whatsapp_session(TEXT, TEXT, TEXT, INT) TO service_role;
