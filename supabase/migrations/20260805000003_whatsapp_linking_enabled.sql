-- ============================================================================
-- Migration: admin-controlled WhatsApp account linking kill-switch
-- Date: 2026-08-05
-- Purpose:
--   * Adds business_settings.whatsapp_linking_enabled (default FALSE) so the
--     store can fully disable the "link WhatsApp number to account" flow
--     (verification email/OTP, order import) without code changes. When
--     disabled, the profile link card is hidden and the server actions
--     reject new links; unlink keeps working.
-- ============================================================================

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS whatsapp_linking_enabled BOOLEAN NOT NULL DEFAULT false;
