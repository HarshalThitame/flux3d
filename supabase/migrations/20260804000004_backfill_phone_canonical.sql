-- ============================================================================
-- Migration: Backfill profiles.phone_canonical (digits-only) from existing
-- phone/phone_number columns. One-time cleanup adopted by the account-linking
-- plan (§8 decision 4): phone canonicalization is E.164 digits-only, and
-- existing rows stored mixed formats, so canonical values are derived here.
-- ============================================================================

UPDATE public.profiles
SET phone_canonical = regexp_replace(
      COALESCE(phone_number, phone, ''),
      '[^0-9]',
      '',
      'g'
    )
WHERE phone_canonical IS NULL
  AND (
    (phone_number IS NOT NULL AND phone_number <> '')
    OR (phone IS NOT NULL AND phone <> '')
  );
