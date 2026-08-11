-- ============================================================================
-- Admin customer detail + analytics schema
--
-- The admin Customers detail page and the analytics subsystem reference a set
-- of tables/columns that no migration ever created (the schema was assumed but
-- never shipped). This migration creates them idempotently and backfills from
-- the real tracking tables that DO exist (user_sessions, page_visits,
-- shelf_wishlists, quote_captures) so existing data shows up immediately.
--
-- Every statement is additive / IF NOT EXISTS so it is safe to run against any
-- environment, including production where some objects may already exist.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: extended analytics columns used by the customer detail page
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS preferred_device text,
  ADD COLUMN IF NOT EXISTS preferred_browser text,
  ADD COLUMN IF NOT EXISTS preferred_language text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS full_address text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS total_spent numeric(12,2),
  ADD COLUMN IF NOT EXISTS avg_order_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS largest_order numeric(12,2),
  ADD COLUMN IF NOT EXISTS smallest_order numeric(12,2),
  ADD COLUMN IF NOT EXISTS first_order_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_order_date timestamptz,
  ADD COLUMN IF NOT EXISTS order_frequency_days numeric,
  ADD COLUMN IF NOT EXISTS lifetime_value_projection numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_site_visits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_time_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_session_duration numeric,
  ADD COLUMN IF NOT EXISTS favorite_page text,
  ADD COLUMN IF NOT EXISTS most_quoted_material text,
  ADD COLUMN IF NOT EXISTS cart_abandonments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cart_abandoned_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS files_uploaded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quote_to_order_conversion_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS whatsapp_messages_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS support_tickets_raised integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrals_made integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS joined_date date;

-- Backfill total_spent from the legacy total_spend column if present.
UPDATE public.profiles
SET total_spent = total_spend
WHERE total_spent IS NULL
  AND total_spend IS NOT NULL;

-- Backfill joined_date from signup timestamp.
UPDATE public.profiles
SET joined_date = created_at::date
WHERE joined_date IS NULL
  AND created_at IS NOT NULL;

-- Indexes backing analytics filters/joins on profiles.
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles (city);
CREATE INDEX IF NOT EXISTS idx_profiles_source ON public.profiles (source);
CREATE INDEX IF NOT EXISTS idx_profiles_joined_date ON public.profiles (joined_date);
CREATE INDEX IF NOT EXISTS idx_profiles_engagement_score ON public.profiles (engagement_score);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_device ON public.profiles (preferred_device);

-- ---------------------------------------------------------------------------
-- anonymous_visitors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anonymous_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1,
  source text,
  device text,
  location text,
  converted_to_user_id uuid
);

ALTER TABLE public.anonymous_visitors
  ADD COLUMN IF NOT EXISTS first_seen timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS visit_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS converted_to_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_last_seen ON public.anonymous_visitors (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_converted_to_user_id
  ON public.anonymous_visitors (converted_to_user_id);

-- ---------------------------------------------------------------------------
-- sessions (analytics read/write model used by the tracking API)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  visitor_id uuid REFERENCES public.anonymous_visitors(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_seen timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer,
  page_views_count integer NOT NULL DEFAULT 0,
  device text,
  location text,
  referrer text,
  quote_checked boolean NOT NULL DEFAULT FALSE,
  file_uploaded boolean NOT NULL DEFAULT FALSE,
  order_placed boolean NOT NULL DEFAULT FALSE,
  payment_reached boolean NOT NULL DEFAULT FALSE,
  exited_at_step text,
  exit_reason text,
  ip_address text
);

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS visitor_id uuid,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS page_views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS quote_checked boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS file_uploaded boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS order_placed boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_reached boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exited_at_step text,
  ADD COLUMN IF NOT EXISTS exit_reason text,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- Ensure the FK relationships the API embeds on exist even if the table
-- pre-existed (guarded so we never fail on a duplicate constraint).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_user_id_fkey' AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_visitor_id_fkey' AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_visitor_id_fkey FOREIGN KEY (visitor_id)
      REFERENCES public.anonymous_visitors(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_id ON public.sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON public.sessions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON public.sessions (device);
CREATE INDEX IF NOT EXISTS idx_sessions_quote_checked ON public.sessions (quote_checked)
  WHERE quote_checked;
CREATE INDEX IF NOT EXISTS idx_sessions_file_uploaded ON public.sessions (file_uploaded)
  WHERE file_uploaded;
CREATE INDEX IF NOT EXISTS idx_sessions_order_placed ON public.sessions (order_placed)
  WHERE order_placed;
CREATE INDEX IF NOT EXISTS idx_sessions_payment_reached ON public.sessions (payment_reached)
  WHERE payment_reached;

-- Backfill from the legacy user_sessions tracking table (guarded to only run
-- when sessions is empty so it never duplicates existing production data).
-- quote_checked / file_uploaded are intentionally not copied: user_sessions has
-- no such columns in migrations, so referencing them would break fresh installs.
INSERT INTO public.sessions (
  session_id,
  user_id,
  started_at,
  ended_at,
  last_seen,
  duration_seconds,
  ip_address,
  device,
  location
)
SELECT
  s.session_id,
  s.user_id,
  s.started_at,
  s.ended_at,
  COALESCE(s.ended_at, s.started_at),
  s.duration_seconds,
  s.ip_address,
  s.device_type,
  NULLIF(TRIM(COALESCE(s.city, '') || COALESCE(', ' || NULLIF(s.country, ''), '')), '')
FROM public.user_sessions s
WHERE NOT EXISTS (SELECT 1 FROM public.sessions LIMIT 1)
ON CONFLICT (session_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- page_views
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  page_url text NOT NULL,
  page_title text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  time_spent_seconds integer,
  scroll_depth_percent numeric,
  actions_taken jsonb
);

ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS page_url text NOT NULL,
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS entered_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS exited_at timestamptz,
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer,
  ADD COLUMN IF NOT EXISTS scroll_depth_percent numeric,
  ADD COLUMN IF NOT EXISTS actions_taken jsonb;

-- FK for the PostgREST embed `sessions!inner(...)` even if the table existed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'page_views_session_id_fkey' AND conrelid = 'public.page_views'::regclass
  ) THEN
    ALTER TABLE public.page_views
      ADD CONSTRAINT page_views_session_id_fkey FOREIGN KEY (session_id)
      REFERENCES public.sessions(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON public.page_views (session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_entered_at ON public.page_views (entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_page_url ON public.page_views (page_url);

-- Backfill from legacy page_visits via the session_id mapping.
INSERT INTO public.page_views (session_id, page_url, page_title, entered_at)
SELECT
  s.id,
  pv.page_url,
  pv.page_name,
  pv.visited_at
FROM public.page_visits pv
JOIN public.sessions s ON s.session_id = pv.session_id
WHERE NOT EXISTS (SELECT 1 FROM public.page_views LIMIT 1);

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotes (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  quote_id text,
  user_id uuid,
  name text,
  email text,
  phone text,
  file_path text,
  config jsonb,
  estimate jsonb,
  notes text,
  message text,
  material text,
  quantity integer,
  weight_grams numeric(12,2),
  estimated_cost numeric(12,2),
  file_uploaded boolean,
  converted_to_order boolean,
  converted_to_order_id uuid,
  time_spent_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS quote_id text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS config jsonb,
  ADD COLUMN IF NOT EXISTS estimate jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS weight_grams numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS file_uploaded boolean,
  ADD COLUMN IF NOT EXISTS converted_to_order boolean,
  ADD COLUMN IF NOT EXISTS converted_to_order_id uuid,
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes (user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_id ON public.quotes (quote_id);

-- Backfill from quote_captures (deferred-order drafts).
INSERT INTO public.quotes (
  quote_id,
  user_id,
  material,
  weight_grams,
  estimated_cost,
  file_uploaded,
  converted_to_order,
  converted_to_order_id,
  created_at
)
SELECT
  qc.reference,
  qc.user_id,
  qc.config_data->>'materialId',
  NULLIF(qc.config_data->>'weightGrams', '')::numeric(12,2),
  (qc.amount_paise::numeric / 100),
  TRUE,
  (qc.order_id IS NOT NULL),
  qc.order_id,
  qc.created_at
FROM public.quote_captures qc
WHERE qc.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.quotes LIMIT 1);

-- ---------------------------------------------------------------------------
-- cart_items (abandoned-cart analytics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  material text,
  quantity integer,
  weight_grams numeric(12,2),
  estimated_cost numeric(12,2),
  express_delivery boolean NOT NULL DEFAULT FALSE,
  gift_packaging boolean NOT NULL DEFAULT FALSE,
  status text NOT NULL DEFAULT 'active',
  abandoned_at timestamptz,
  abandoned_reason text,
  converted_to_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS weight_grams numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS express_delivery boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gift_packaging boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS abandoned_at timestamptz,
  ADD COLUMN IF NOT EXISTS abandoned_reason text,
  ADD COLUMN IF NOT EXISTS converted_to_order_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_status_abandoned_at
  ON public.cart_items (abandoned_at DESC)
  WHERE status = 'abandoned';
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON public.cart_items (created_at DESC);

-- ---------------------------------------------------------------------------
-- wishlist_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name text,
  material text,
  price numeric(12,2),
  added_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  ordered boolean NOT NULL DEFAULT FALSE,
  order_id uuid
);

ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS added_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS ordered boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS order_id uuid;

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_added_at ON public.wishlist_items (added_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_ordered ON public.wishlist_items (ordered)
  WHERE NOT ordered;

-- Backfill from shelf_wishlists joined to products.
INSERT INTO public.wishlist_items (user_id, product_name, price, added_at, ordered)
SELECT
  w.user_id,
  COALESCE(p.name, 'Unknown product'),
  p.base_price,
  w.created_at,
  FALSE
FROM public.shelf_wishlists w
LEFT JOIN public.shelf_products p ON p.id = w.product_id
WHERE NOT EXISTS (SELECT 1 FROM public.wishlist_items LIMIT 1);

-- ---------------------------------------------------------------------------
-- support_tickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer text,
  customer_email text,
  customer_phone text,
  subject text,
  category text,
  priority text,
  status text NOT NULL DEFAULT 'Open',
  assigned_to uuid,
  description text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  resolution_time_minutes integer,
  satisfaction_rating integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_id text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS customer text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolution_time_minutes integer,
  ADD COLUMN IF NOT EXISTS satisfaction_rating integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_ticket_id ON public.support_tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS & grants
-- ---------------------------------------------------------------------------
-- All of these are back-office / analytics tables. Writers and readers run with
-- the service role (tracking API, admin pages), so they get full service_role
-- access. quotes also needs authenticated user access because the customer
-- facing quote builder and Saved Quotes page write/read it with the user role.

ALTER TABLE public.anonymous_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anonymous_visitors_service_role_all" ON public.anonymous_visitors;
CREATE POLICY "anonymous_visitors_service_role_all" ON public.anonymous_visitors
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anonymous_visitors TO service_role;

DROP POLICY IF EXISTS "sessions_service_role_all" ON public.sessions;
CREATE POLICY "sessions_service_role_all" ON public.sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO service_role;

DROP POLICY IF EXISTS "page_views_service_role_all" ON public.page_views;
CREATE POLICY "page_views_service_role_all" ON public.page_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_views TO service_role;

DROP POLICY IF EXISTS "cart_items_service_role_all" ON public.cart_items;
CREATE POLICY "cart_items_service_role_all" ON public.cart_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO service_role;

DROP POLICY IF EXISTS "wishlist_items_service_role_all" ON public.wishlist_items;
CREATE POLICY "wishlist_items_service_role_all" ON public.wishlist_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO service_role;

DROP POLICY IF EXISTS "support_tickets_service_role_all" ON public.support_tickets;
CREATE POLICY "support_tickets_service_role_all" ON public.support_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS "quotes_service_role_all" ON public.quotes;
CREATE POLICY "quotes_service_role_all" ON public.quotes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO service_role;

DROP POLICY IF EXISTS "quotes_select_own" ON public.quotes;
CREATE POLICY "quotes_select_own" ON public.quotes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "quotes_insert_own" ON public.quotes;
CREATE POLICY "quotes_insert_own" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quotes_update_own" ON public.quotes;
CREATE POLICY "quotes_update_own" ON public.quotes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quotes_delete_own" ON public.quotes;
CREATE POLICY "quotes_delete_own" ON public.quotes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;

DROP POLICY IF EXISTS "support_tickets_select_own" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.support_tickets TO authenticated;
