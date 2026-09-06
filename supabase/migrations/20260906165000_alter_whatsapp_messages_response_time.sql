-- Migration to change response_time_minutes from INTEGER to DOUBLE PRECISION
-- Allows storing fractional minutes for more accurate response time tracking

ALTER TABLE public.whatsapp_messages
  ALTER COLUMN response_time_minutes TYPE DOUBLE PRECISION USING response_time_minutes::DOUBLE PRECISION;

-- Optionally, add a comment describing the change
COMMENT ON COLUMN public.whatsapp_messages.response_time_minutes IS 'Response time in minutes (fractional allowed).';
