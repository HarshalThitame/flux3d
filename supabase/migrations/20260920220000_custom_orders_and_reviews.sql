-- Part A: Custom Orders Schema

CREATE SEQUENCE IF NOT EXISTS custom_order_serial START 1;

CREATE TABLE IF NOT EXISTS custom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE, -- Populated by trigger
    source_channel TEXT NOT NULL CHECK (source_channel IN ('whatsapp_dm', 'phone_call', 'instagram', 'in_person', 'bot', 'website')),
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'link_sent', 'partially_paid', 'paid', 'cod')),
    payment_link_url TEXT,
    payment_link_id TEXT,
    delivery_address JSONB DEFAULT '{}'::jsonb,
    admin_notes TEXT,
    internal_notes TEXT,
    created_by_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    status_timestamps JSONB DEFAULT '{}'::jsonb
);

-- Trigger: Before INSERT on custom_orders, generate order_number
CREATE OR REPLACE FUNCTION generate_custom_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'FLX-CU-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('custom_order_serial')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_custom_orders_order_number
BEFORE INSERT ON custom_orders
FOR EACH ROW
EXECUTE FUNCTION generate_custom_order_number();

CREATE TABLE IF NOT EXISTS custom_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES custom_orders(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL DEFAULT 'custom_spec' CHECK (item_type IN ('catalog_product', 'custom_spec')),
    description TEXT NOT NULL,
    reference_image_urls TEXT[] DEFAULT '{}',
    material TEXT,
    color TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Part B: Unified Reviews Schema

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID, -- Polymorphic reference to orders, shelf_orders, or custom_orders
    order_type TEXT NOT NULL CHECK (order_type IN ('shop', 'custom', 'custom_order')),
    order_number TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    raw_customer_input TEXT,
    review_text TEXT,
    ai_assisted BOOLEAN NOT NULL DEFAULT false,
    customer_display_name TEXT,
    customer_avatar_seed TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    featured BOOLEAN NOT NULL DEFAULT false,
    consent_display BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('shop', 'custom', 'custom_order')),
    token TEXT NOT NULL UNIQUE,
    channel_sent TEXT CHECK (channel_sent IN ('whatsapp', 'sms', 'email', 'manual_copy')),
    created_by_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 days'),
    used_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Part C: Indexes

CREATE INDEX IF NOT EXISTS idx_custom_orders_customer_id ON custom_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON custom_orders(status);
CREATE INDEX IF NOT EXISTS idx_custom_orders_payment_status ON custom_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_custom_orders_created_by_admin_id ON custom_orders(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_created_at_desc ON custom_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_order_items_order_id ON custom_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_type ON reviews(order_type);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(featured);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_submitted_at_desc ON reviews(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_landing_page ON reviews(status, featured DESC, rating DESC, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_links_token ON review_links(token);
CREATE INDEX IF NOT EXISTS idx_review_links_order_id ON review_links(order_id);
CREATE INDEX IF NOT EXISTS idx_review_links_expires_at ON review_links(expires_at);

-- Part D: RLS Policies

ALTER TABLE custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_links ENABLE ROW LEVEL SECURITY;

-- Note: postgres service_role automatically bypasses RLS, so admin queries using the service key will work for all tables.
-- Anon and Authenticated policies:

CREATE POLICY "Public can view approved reviews" ON reviews
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "Public can lookup review links by token" ON review_links
FOR SELECT
TO anon
USING (true); -- application logic should filter by token

-- Part E: Updated triggers

-- updated_at trigger on custom_orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_orders_updated_at
BEFORE UPDATE ON custom_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate subtotal on custom_order_items
CREATE OR REPLACE FUNCTION calculate_custom_order_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_custom_order_items_subtotal
BEFORE INSERT OR UPDATE ON custom_order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_custom_order_item_subtotal();

-- Part F: Storage bucket

INSERT INTO storage.buckets (id, name, public) 
VALUES ('custom-order-images', 'custom-order-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public 
USING ( bucket_id = 'custom-order-images' );

CREATE POLICY "Authenticated users can upload custom order images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'custom-order-images' );

-- Migrate existing shelf_reviews to the new unified reviews table
INSERT INTO reviews (
    order_id,
    order_type,
    rating,
    raw_customer_input,
    review_text,
    ai_assisted,
    customer_display_name,
    status,
    submitted_at,
    created_at
)
SELECT 
    sr.order_id,
    'shop',
    sr.rating,
    sr.title,
    sr.body,
    false,
    COALESCE(p.name, p.full_name, 'Verified Customer'),
    CASE WHEN sr.is_approved THEN 'approved' ELSE 'pending_review' END,
    sr.created_at,
    sr.created_at
FROM shelf_reviews sr
LEFT JOIN profiles p ON p.id = sr.user_id;
