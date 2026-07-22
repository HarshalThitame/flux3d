-- ============================================================
-- Data Auditability Hardening Migration
-- Upgrades quote_versions auditability to enterprise 5/5
-- ============================================================

-- ============================================================
-- 1. Add snapshot_schema_version to quote_versions
--    Enables forward-compatible snapshot migrations
-- ============================================================
ALTER TABLE public.quote_versions
  ADD COLUMN IF NOT EXISTS snapshot_schema_version INTEGER NOT NULL DEFAULT 1;

-- ============================================================
-- 2. Immutability trigger on quote_versions pricing_snapshot
--    and model_metadata — prevents any UPDATE tampering
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_quote_snapshot_tampering()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.pricing_snapshot IS DISTINCT FROM NEW.pricing_snapshot THEN
    RAISE EXCEPTION 'quote_versions.pricing_snapshot is immutable after creation (id: %)', OLD.id;
  END IF;
  IF OLD.model_metadata IS DISTINCT FROM NEW.model_metadata THEN
    RAISE EXCEPTION 'quote_versions.model_metadata is immutable after creation (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_versions_snapshot_immutable ON public.quote_versions;
CREATE TRIGGER trg_quote_versions_snapshot_immutable
  BEFORE UPDATE ON public.quote_versions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_quote_snapshot_tampering();

-- ============================================================
-- 3. quote_version_events — immutable discrete event log
--    Every status transition is recorded as a separate row
--    that can never be updated or deleted
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_version_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_version_id  UUID        NOT NULL REFERENCES public.quote_versions(id) ON DELETE CASCADE,
  order_id          UUID        REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role        TEXT        NOT NULL DEFAULT 'system'
                                CHECK (actor_role IN ('customer', 'admin', 'system')),
  event_type        TEXT        NOT NULL
                                CHECK (event_type IN (
                                  'created', 'submitted', 'approved', 'rejected',
                                  'expired', 'version_bumped'
                                )),
  previous_status   TEXT,
  new_status        TEXT        NOT NULL,
  note              TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_quote_version_events_version_id
  ON public.quote_version_events(quote_version_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_version_events_order_id
  ON public.quote_version_events(order_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_version_events_actor_id
  ON public.quote_version_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_quote_version_events_event_type
  ON public.quote_version_events(event_type);

-- Immutability rules: UPDATE and DELETE produce no effect at DB level
CREATE OR REPLACE RULE no_update_quote_version_events AS
  ON UPDATE TO public.quote_version_events DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_quote_version_events AS
  ON DELETE TO public.quote_version_events DO INSTEAD NOTHING;

-- ============================================================
-- 4. RLS on quote_version_events
-- ============================================================
ALTER TABLE public.quote_version_events ENABLE ROW LEVEL SECURITY;

-- Users can read events for their own quote versions
DROP POLICY IF EXISTS "qve_select_own" ON public.quote_version_events;
CREATE POLICY "qve_select_own" ON public.quote_version_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_versions qv
      WHERE qv.id = quote_version_events.quote_version_id
        AND qv.user_id = auth.uid()
    )
  );

-- Service role can insert and select (no update/delete — rules block those)
DROP POLICY IF EXISTS "qve_service_role_insert" ON public.quote_version_events;
CREATE POLICY "qve_service_role_insert" ON public.quote_version_events
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "qve_service_role_select" ON public.quote_version_events;
CREATE POLICY "qve_service_role_select" ON public.quote_version_events
  FOR SELECT TO service_role USING (true);

-- ============================================================
-- 5. Harden admin_audit_logs — block UPDATE and DELETE
--    for all roles at the DB rules level
-- ============================================================
CREATE OR REPLACE RULE no_update_admin_audit_logs AS
  ON UPDATE TO public.admin_audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_admin_audit_logs AS
  ON DELETE TO public.admin_audit_logs DO INSTEAD NOTHING;

-- ============================================================
-- 6. Grants for the new table
-- ============================================================
GRANT INSERT, SELECT ON public.quote_version_events TO service_role;
GRANT SELECT ON public.quote_version_events TO authenticated;
