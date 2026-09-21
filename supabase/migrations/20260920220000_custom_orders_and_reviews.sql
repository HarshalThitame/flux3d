-- Migration: 20260920220000_custom_orders_and_reviews.sql

-- 1. Create custom_orders and custom_order_items
CREATE SEQUENCE IF NOT EXISTS custom_order_seq START 1;

CREATE TABLE IF NOT EXISTS public.custom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id TEXT UNIQUE DEFAULT 'FLX-CU-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('custom_order_seq')::text, 4, '0'),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    shipping_address JSONB,
    subtotal NUMERIC(10,2) DEFAULT 0.00,
    tax NUMERIC(10,2) DEFAULT 0.00,
    shipping_fee NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_link_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.custom_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_order_id UUID NOT NULL REFERENCES public.custom_orders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to calculate totals
CREATE OR REPLACE FUNCTION calculate_custom_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.custom_orders
    SET subtotal = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.custom_order_items
        WHERE custom_order_id = NEW.custom_order_id
    )
    WHERE id = NEW.custom_order_id;
    
    UPDATE public.custom_orders
    SET total = subtotal + tax + shipping_fee
    WHERE id = NEW.custom_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.custom_order_items
FOR EACH ROW EXECUTE FUNCTION calculate_custom_order_totals();


-- 2. Create unified polymorphic reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_type TEXT NOT NULL CHECK (order_type IN ('shop', 'custom', 'custom_order')),
    order_id UUID NOT NULL, -- references either shelf_orders or custom_orders but not strictly enforced due to polymorphism
    product_id UUID, -- Optional, used for 'shop'
    user_id UUID, -- Optional, for authenticated users
    customer_name TEXT, -- Store name for guest/custom orders
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    body TEXT,
    image_urls TEXT[] DEFAULT '{}',
    is_verified_purchase BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create review_links table
CREATE TABLE IF NOT EXISTS public.review_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    order_type TEXT NOT NULL,
    order_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Data Migration: migrate existing shelf_reviews
INSERT INTO public.reviews (
    order_type,
    order_id,
    product_id,
    user_id,
    rating,
    title,
    body,
    image_urls,
    is_verified_purchase,
    status,
    created_at
)
SELECT
    'shop' AS order_type,
    order_id,
    product_id,
    user_id,
    rating,
    title,
    body,
    image_urls,
    is_verified_purchase,
    CASE WHEN is_approved THEN 'approved' ELSE 'pending' END AS status,
    created_at
FROM public.shelf_reviews;

-- Optional: Drop shelf_reviews or keep it for backup
-- DROP TABLE IF EXISTS public.shelf_reviews;
