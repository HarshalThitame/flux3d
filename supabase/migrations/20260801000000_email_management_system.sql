-- ============================================================================
-- Migration: Email Management System (EMS) — Phase 0 Database Foundation
-- Date: 2026-08-01
-- Purpose:
--   1. Create email_templates (CMS-style editable HTML templates)
--   2. Create email_template_versions (audit trail for template changes)
--   3. Create email_automation_rules (event-driven dispatch rules)
--   4. Create email_queue (explicit retry/control queue)
--   5. Create email_branding (singleton branded wrapper config)
--   6. Create email_settings (singleton global toggles)
--   7. Alter email_logs to link templates, queue, and variables
--   8. Indexes, RLS, triggers, grants, and comments
-- ============================================================================

-- ============================================================================
-- 1. email_templates — Editable CMS Templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  email_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('transactional', 'marketing', 'support', 'admin', 'system')
  ),
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  plain_text TEXT,
  variables JSONB NOT NULL DEFAULT '[]',

  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_email_type ON public.email_templates(email_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_enabled ON public.email_templates(is_enabled);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_system ON public.email_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at_desc ON public.email_templates(created_at DESC);

-- Partial unique: only one system template per email_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_system_unique_type
  ON public.email_templates(email_type)
  WHERE is_system = TRUE;

-- ============================================================================
-- 2. email_template_versions — Version History
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  subject TEXT,
  html_body TEXT,
  plain_text TEXT,
  variables JSONB,

  editor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: version history ordered newest first
CREATE INDEX IF NOT EXISTS idx_email_template_versions_template_version
  ON public.email_template_versions(template_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_created_at
  ON public.email_template_versions(created_at DESC);

-- Prevent duplicate version numbers for the same template
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_versions_unique_number
  ON public.email_template_versions(template_id, version_number);

-- ============================================================================
-- 3. email_automation_rules — Event-Driven Rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_name TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  target_audience TEXT NOT NULL CHECK (
    target_audience IN ('customer', 'admin', 'both')
  ),
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  conditions JSONB NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: automation rules
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_event_enabled
  ON public.email_automation_rules(event_name, is_enabled);
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_template_id
  ON public.email_automation_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_created_at_desc
  ON public.email_automation_rules(created_at DESC);

-- ============================================================================
-- 4. email_queue — Explicit Queue for Retry / Control
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled')
  ),
  priority INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: queue lookups
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON public.email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_template_id ON public.email_queue(template_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at_desc ON public.email_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
  ON public.email_queue(status, scheduled_at)
  WHERE status IN ('queued', 'sending', 'failed');

-- ============================================================================
-- 5. email_branding — Singleton Branded Wrapper Config
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_branding (
  id TEXT PRIMARY KEY DEFAULT 'default',

  logo_url TEXT,
  company_name TEXT,
  address TEXT,
  gst_number TEXT,
  support_email TEXT,
  support_phone TEXT,
  primary_color TEXT DEFAULT '#FF5C1A',
  secondary_color TEXT DEFAULT '#39BDF8',
  accent_color TEXT,
  footer_text TEXT,
  social_icons JSONB DEFAULT '{}',
  dark_mode_css TEXT,
  header_html TEXT,
  footer_html TEXT,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default row
INSERT INTO public.email_branding (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. email_settings — Singleton Global Toggles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',

  emails_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  pause_all_emails BOOLEAN NOT NULL DEFAULT FALSE,
  retry_failed BOOLEAN NOT NULL DEFAULT TRUE,
  max_retries INTEGER NOT NULL DEFAULT 3,
  sender_name TEXT,
  sender_email TEXT,
  reply_to TEXT,
  bcc TEXT,
  cc TEXT,
  footer TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default row
INSERT INTO public.email_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. Alter email_logs to link templates, queue, and variables
-- ============================================================================
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variables_used JSONB,
  ADD COLUMN IF NOT EXISTS queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL;

-- New indexes on email_logs for EMS lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_template_id ON public.email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_queue_id ON public.email_logs(queue_id);

-- Allow arbitrary email_type values for EMS flexibility
-- (admins can create custom templates with new event types)
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

-- ============================================================================
-- 8. RLS Policies — Admin CRUD only, Users no access
-- ============================================================================

-- email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email_templates" ON public.email_templates;
CREATE POLICY "Admins can manage email_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role can manage email_templates" ON public.email_templates;
CREATE POLICY "Service role can manage email_templates" ON public.email_templates
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- email_template_versions
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email_template_versions" ON public.email_template_versions;
CREATE POLICY "Admins can manage email_template_versions" ON public.email_template_versions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role can manage email_template_versions" ON public.email_template_versions;
CREATE POLICY "Service role can manage email_template_versions" ON public.email_template_versions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- email_automation_rules
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email_automation_rules" ON public.email_automation_rules;
CREATE POLICY "Admins can manage email_automation_rules" ON public.email_automation_rules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role can manage email_automation_rules" ON public.email_automation_rules;
CREATE POLICY "Service role can manage email_automation_rules" ON public.email_automation_rules
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- email_queue
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email_queue" ON public.email_queue;
CREATE POLICY "Admins can manage email_queue" ON public.email_queue
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role can manage email_queue" ON public.email_queue;
CREATE POLICY "Service role can manage email_queue" ON public.email_queue
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- email_branding
ALTER TABLE public.email_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email_branding" ON public.email_branding;
CREATE POLICY "Admins can manage email_branding" ON public.email_branding
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role can manage email_branding" ON public.email_branding;
CREATE POLICY "Service role can manage email_branding" ON public.email_branding
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- email_settings
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email_settings" ON public.email_settings;
CREATE POLICY "Admins can manage email_settings" ON public.email_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role can manage email_settings" ON public.email_settings;
CREATE POLICY "Service role can manage email_settings" ON public.email_settings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 9. Grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_template_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_template_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_automation_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_automation_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_branding TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_branding TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_settings TO service_role;

-- ============================================================================
-- 10. Auto-update updated_at triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_email_automation_rules_updated_at ON public.email_automation_rules;
CREATE TRIGGER trg_email_automation_rules_updated_at
  BEFORE UPDATE ON public.email_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_email_queue_updated_at ON public.email_queue;
CREATE TRIGGER trg_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_email_branding_updated_at ON public.email_branding;
CREATE TRIGGER trg_email_branding_updated_at
  BEFORE UPDATE ON public.email_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_email_settings_updated_at ON public.email_settings;
CREATE TRIGGER trg_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 11. Comments for documentation
-- ============================================================================
COMMENT ON TABLE public.email_templates IS 'CMS-style editable email templates. HTML string bodies with {{variable}} placeholders. One row per template.';
COMMENT ON TABLE public.email_template_versions IS 'Audit trail of every published change to an email template. Each edit creates a new version row.';
COMMENT ON TABLE public.email_automation_rules IS 'Event-driven rules that map business events (e.g. order_created) to email templates, audience, and delay.';
COMMENT ON TABLE public.email_queue IS 'Explicit dispatch queue for emails requiring retry, scheduling, or manual admin control.';
COMMENT ON TABLE public.email_branding IS 'Singleton branding config used by the template wrapper to inject header/footer/colors into every email.';
COMMENT ON TABLE public.email_settings IS 'Singleton global toggles and defaults for the email management system.';

COMMENT ON COLUMN public.email_templates.email_type IS 'Must match the EmailType TypeScript enum. Enforced at application layer for flexibility.';
COMMENT ON COLUMN public.email_templates.variables IS 'JSON array of required variable names, e.g. ["user_name","order_id"]. Used by the admin UI for validation.';
COMMENT ON COLUMN public.email_templates.is_system IS 'Protects built-in templates from deletion. Only one system template allowed per email_type.';
COMMENT ON COLUMN public.email_logs.template_id IS 'Reference to the email_template used for this dispatch. NULL for legacy logs.';
COMMENT ON COLUMN public.email_logs.variables_used IS 'Snapshot of the variable map injected into the template at send time.';
COMMENT ON COLUMN public.email_logs.queue_id IS 'Reference to the email_queue row that managed this dispatch, if applicable.';
