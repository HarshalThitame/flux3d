-- Enterprise authoritative quote analysis pipeline.
-- Browser clients may read their own jobs/results/versions, but every write is
-- performed by the application or isolated worker with the service role.

CREATE TABLE IF NOT EXISTS public.quote_printer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  machine_model TEXT NOT NULL,
  nozzle_diameter_mm NUMERIC(6,3) NOT NULL CHECK (nozzle_diameter_mm > 0),
  build_volume_mm JSONB NOT NULL,
  slicer_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_key, version)
);

CREATE TABLE IF NOT EXISTS public.quote_filament_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  density_g_cm3 NUMERIC(8,5) NOT NULL CHECK (density_g_cm3 > 0),
  material_rate_paise_per_gram BIGINT NOT NULL CHECK (material_rate_paise_per_gram >= 0),
  slicer_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_key, version)
);

CREATE TABLE IF NOT EXISTS public.quote_process_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  layer_height_mm NUMERIC(6,3) NOT NULL CHECK (layer_height_mm IN (0.08, 0.12, 0.20)),
  slicer_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_key, version)
);

CREATE TABLE IF NOT EXISTS public.quote_pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key TEXT NOT NULL,
  version TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  machine_rate_paise_per_hour BIGINT NOT NULL CHECK (machine_rate_paise_per_hour >= 0),
  labour_rate_paise_per_hour BIGINT NOT NULL CHECK (labour_rate_paise_per_hour >= 0),
  setup_minutes INTEGER NOT NULL DEFAULT 0 CHECK (setup_minutes >= 0),
  per_part_labour_minutes INTEGER NOT NULL DEFAULT 0 CHECK (per_part_labour_minutes >= 0),
  surface_rate_paise_per_cm2 BIGINT NOT NULL DEFAULT 0 CHECK (surface_rate_paise_per_cm2 >= 0),
  consumables_paise BIGINT NOT NULL DEFAULT 0 CHECK (consumables_paise >= 0),
  overhead_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (overhead_basis_points BETWEEN 0 AND 100000),
  margin_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (margin_basis_points BETWEEN 0 AND 9999),
  gst_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (gst_basis_points BETWEEN 0 AND 10000),
  minimum_order_paise BIGINT NOT NULL DEFAULT 0 CHECK (minimum_order_paise >= 0),
  delivery_threshold_paise BIGINT NOT NULL DEFAULT 0 CHECK (delivery_threshold_paise >= 0),
  default_delivery_paise BIGINT NOT NULL DEFAULT 0 CHECK (default_delivery_paise >= 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_key, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_printer_profiles_one_active
  ON public.quote_printer_profiles (profile_key) WHERE is_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_filament_profiles_one_active
  ON public.quote_filament_profiles (profile_key) WHERE is_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_process_profiles_one_active
  ON public.quote_process_profiles (profile_key) WHERE is_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_pricing_profiles_one_active
  ON public.quote_pricing_profiles ((true)) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.quote_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_job_id UUID REFERENCES public.quote_analysis_jobs(id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'quote-models',
  storage_path TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 104857600),
  file_sha256 TEXT CHECK (file_sha256 IS NULL OR file_sha256 ~ '^[a-f0-9]{64}$'),
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded', 'queued', 'converting', 'validating', 'orienting', 'slicing',
    'ready', 'manual_review', 'failed'
  )),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  unit_override TEXT CHECK (unit_override IS NULL OR unit_override IN ('mm', 'cm', 'm', 'in', 'ft')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  diagnostic_codes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(diagnostic_codes) = 'array'),
  failure_stage TEXT,
  failure_message TEXT,
  worker_job_id TEXT,
  geometry_cache_hit BOOLEAN,
  slicing_cache_hit BOOLEAN,
  processing_duration_ms INTEGER CHECK (processing_duration_ms IS NULL OR processing_duration_ms >= 0),
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.quote_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL UNIQUE REFERENCES public.quote_analysis_jobs(id) ON DELETE RESTRICT,
  geometry_hash TEXT NOT NULL CHECK (geometry_hash ~ '^[a-f0-9]{64}$'),
  result_kind TEXT NOT NULL CHECK (result_kind IN ('ready', 'manual_review')),
  importer TEXT NOT NULL,
  importer_version TEXT NOT NULL,
  slicer_version TEXT,
  canonical_model_path TEXT,
  preview_path TEXT,
  dimensions_mm JSONB NOT NULL,
  solid_volume_mm3 NUMERIC(24,6) NOT NULL CHECK (solid_volume_mm3 >= 0),
  surface_area_mm2 NUMERIC(24,6) CHECK (surface_area_mm2 IS NULL OR surface_area_mm2 >= 0),
  triangle_count BIGINT CHECK (triangle_count IS NULL OR triangle_count >= 0),
  geometry_quality JSONB NOT NULL DEFAULT '{}'::jsonb,
  chosen_orientation JSONB,
  slicer_metrics JSONB,
  profile_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  warning_codes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(warning_codes) = 'array'),
  manual_review JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_analysis_jobs_user_created
  ON public.quote_analysis_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_analysis_jobs_status_queue
  ON public.quote_analysis_jobs (status, queued_at)
  WHERE status IN ('uploaded', 'queued', 'converting', 'validating', 'orienting', 'slicing');
CREATE INDEX IF NOT EXISTS idx_quote_analysis_jobs_sha256
  ON public.quote_analysis_jobs (file_sha256) WHERE file_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_analysis_jobs_storage_path
  ON public.quote_analysis_jobs (user_id, storage_path);
CREATE INDEX IF NOT EXISTS idx_quote_analysis_results_geometry_hash
  ON public.quote_analysis_results (geometry_hash);

ALTER TABLE public.quote_versions
  ADD COLUMN IF NOT EXISTS analysis_job_id UUID REFERENCES public.quote_analysis_jobs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS analysis_result_id UUID REFERENCES public.quote_analysis_results(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS subtotal_paise BIGINT,
  ADD COLUMN IF NOT EXISTS discount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS gst_paise BIGINT,
  ADD COLUMN IF NOT EXISTS delivery_paise BIGINT,
  ADD COLUMN IF NOT EXISTS total_paise BIGINT,
  ADD COLUMN IF NOT EXISTS authoritative_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_versions JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.quote_captures
  ADD COLUMN IF NOT EXISTS quote_version_id UUID REFERENCES public.quote_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS checkout_key TEXT CHECK (
    checkout_key IS NULL OR checkout_key ~ '^[a-f0-9]{64}$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_captures_pending_quote_version
  ON public.quote_captures (quote_version_id)
  WHERE quote_version_id IS NOT NULL AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_captures_pending_checkout_key
  ON public.quote_captures (user_id, checkout_key)
  WHERE checkout_key IS NOT NULL AND status = 'pending';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS quote_version_id UUID REFERENCES public.quote_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS finished_weight_grams NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS consumed_material_grams NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS solid_volume_mm3 NUMERIC(24,6),
  ADD COLUMN IF NOT EXISTS normalized_dimensions_mm JSONB,
  ADD COLUMN IF NOT EXISTS plate_count INTEGER,
  ADD COLUMN IF NOT EXISTS slicer_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS quote_profile_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quote_audit_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_quote_version
  ON public.orders (quote_version_id) WHERE quote_version_id IS NOT NULL;

ALTER TABLE public.quote_versions
  DROP CONSTRAINT IF EXISTS quote_versions_currency_check;
ALTER TABLE public.quote_versions
  ADD CONSTRAINT quote_versions_currency_check CHECK (currency = 'INR');
ALTER TABLE public.quote_versions
  DROP CONSTRAINT IF EXISTS quote_versions_paise_nonnegative;
ALTER TABLE public.quote_versions
  ADD CONSTRAINT quote_versions_paise_nonnegative CHECK (
    (subtotal_paise IS NULL OR subtotal_paise >= 0) AND
    (discount_paise IS NULL OR discount_paise >= 0) AND
    (gst_paise IS NULL OR gst_paise >= 0) AND
    (delivery_paise IS NULL OR delivery_paise >= 0) AND
    (total_paise IS NULL OR total_paise >= 0)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_versions_analysis_job
  ON public.quote_versions (analysis_job_id) WHERE analysis_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_versions_checkout
  ON public.quote_versions (user_id, status, expires_at)
  WHERE total_paise IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_quote_immutable_row_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_analysis_results_immutable ON public.quote_analysis_results;
CREATE TRIGGER trg_quote_analysis_results_immutable
  BEFORE UPDATE OR DELETE ON public.quote_analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.prevent_quote_immutable_row_changes();

CREATE OR REPLACE FUNCTION public.prevent_quote_profile_content_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% rows cannot be deleted', TG_TABLE_NAME;
  END IF;
  IF (to_jsonb(OLD) - 'is_active') IS DISTINCT FROM
     (to_jsonb(NEW) - 'is_active') THEN
    RAISE EXCEPTION '% profile content is immutable; insert a new version', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE profile_table REGCLASS;
BEGIN
  FOREACH profile_table IN ARRAY ARRAY[
    'public.quote_printer_profiles'::regclass,
    'public.quote_filament_profiles'::regclass,
    'public.quote_process_profiles'::regclass,
    'public.quote_pricing_profiles'::regclass
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION public.prevent_quote_profile_content_changes()',
      'trg_' || replace(profile_table::text, '.', '_') || '_immutable',
      profile_table
    );
  END LOOP;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TABLE public.quote_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_printer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_filament_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_process_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_pricing_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.quote_analysis_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.quote_analysis_results FROM anon, authenticated;
REVOKE ALL ON TABLE public.quote_printer_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.quote_filament_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.quote_process_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.quote_pricing_profiles FROM anon, authenticated;

GRANT SELECT ON TABLE public.quote_analysis_jobs TO authenticated;
GRANT SELECT ON TABLE public.quote_analysis_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quote_analysis_jobs TO service_role;
GRANT SELECT, INSERT ON TABLE public.quote_analysis_results TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.quote_printer_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.quote_filament_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.quote_process_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.quote_pricing_profiles TO service_role;

DROP POLICY IF EXISTS quote_analysis_jobs_select_own ON public.quote_analysis_jobs;
CREATE POLICY quote_analysis_jobs_select_own ON public.quote_analysis_jobs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS quote_analysis_jobs_service_all ON public.quote_analysis_jobs;
CREATE POLICY quote_analysis_jobs_service_all ON public.quote_analysis_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quote_analysis_results_select_own ON public.quote_analysis_results;
CREATE POLICY quote_analysis_results_select_own ON public.quote_analysis_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quote_analysis_jobs job
    WHERE job.id = quote_analysis_results.analysis_job_id
      AND job.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS quote_analysis_results_service_insert ON public.quote_analysis_results;
CREATE POLICY quote_analysis_results_service_insert ON public.quote_analysis_results
  FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS quote_analysis_results_service_select ON public.quote_analysis_results;
CREATE POLICY quote_analysis_results_service_select ON public.quote_analysis_results
  FOR SELECT TO service_role USING (true);

REVOKE ALL ON FUNCTION public.prevent_quote_immutable_row_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_quote_profile_content_changes() FROM PUBLIC;

-- The worker target is initially the stock A1/0.4 mm nozzle. Actual slicer
-- profile payloads and calibrated pricing rates must be inserted by deployment
-- tooling before paid checkout is enabled.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 104857600
WHERE id = 'quote-models';

INSERT INTO public.quote_printer_profiles (
  profile_key, version, display_name, machine_model, nozzle_diameter_mm,
  build_volume_mm, slicer_profile, is_active
) VALUES (
  'bambu-a1-0.4', 'bootstrap-1', 'Bambu Lab A1 (0.4 mm)', 'Bambu Lab A1', 0.4,
  '{"x":256,"y":256,"z":256}'::jsonb, '{}'::jsonb, false
) ON CONFLICT (profile_key, version) DO NOTHING;

INSERT INTO public.quote_process_profiles (
  profile_key, version, display_name, layer_height_mm, slicer_profile, is_active
) VALUES
  ('standard-020', 'bootstrap-1', 'Standard 0.20 mm', 0.20, '{}'::jsonb, false),
  ('quality-012', 'bootstrap-1', 'High quality 0.12 mm', 0.12, '{}'::jsonb, false),
  ('ultra-008', 'bootstrap-1', 'Ultra quality 0.08 mm', 0.08, '{}'::jsonb, false)
ON CONFLICT (profile_key, version) DO NOTHING;

COMMENT ON TABLE public.quote_analysis_jobs IS
  'Mutable orchestration records for authoritative geometry and slicing jobs.';
COMMENT ON TABLE public.quote_analysis_results IS
  'Immutable geometry and slicer output produced by the isolated quote worker.';
COMMENT ON COLUMN public.quote_versions.total_paise IS
  'Authoritative checkout total in integer paise; never accepted from browser input.';
