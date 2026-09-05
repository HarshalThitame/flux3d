const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const sql = `
CREATE OR REPLACE FUNCTION insert_whatsapp_message_if_not_exists(
  p_user_id UUID,
  p_sender TEXT,
  p_direction TEXT,
  p_message_text TEXT,
  p_automated BOOLEAN,
  p_trigger_event TEXT,
  p_responded BOOLEAN,
  p_response_time_minutes NUMERIC,
  p_media_type TEXT,
  p_media_url TEXT,
  p_media_filename TEXT,
  p_media_mime_type TEXT,
  p_media_size_bytes INTEGER,
  p_meta_message_id TEXT,
  p_status TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_meta_message_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.whatsapp_messages WHERE meta_message_id = p_meta_message_id) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.whatsapp_messages (
    user_id, sender, direction, message_text, automated, trigger_event,
    responded, response_time_minutes, media_type, media_url,
    media_filename, media_mime_type, media_size_bytes, meta_message_id, status
  ) VALUES (
    p_user_id, p_sender, p_direction, p_message_text, p_automated, p_trigger_event,
    p_responded, p_response_time_minutes, p_media_type, p_media_url,
    p_media_filename, p_media_mime_type, p_media_size_bytes, p_meta_message_id, p_status
  );
END;
$$;
  `;
  try {
    await client.query(sql);
    console.log("Successfully created RPC function");
  } catch (err) {
    console.error("Error:", err.message);
  }
  await client.end();
}
run();
