-- Component 1: Order Status -> Template Mapping Table
CREATE TABLE public.order_status_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_status TEXT NOT NULL UNIQUE,
    template_name TEXT NOT NULL,
    template_language TEXT NOT NULL DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT true,
    cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed defaults for existing statuses
INSERT INTO public.order_status_notifications (order_status, template_name, cooldown_minutes) VALUES
('payment_confirmed', 'order_payment_confirmed', 5),
('shipped', 'order_shipped', 60),
('out_for_delivery', 'order_out_for_delivery', 60),
('delivered', 'order_delivered', 60),
('payment_failed', 'payment_failed', 15),
('refunded', 'order_refunded', 60)
ON CONFLICT (order_status) DO NOTHING;

-- Component 4: Send Queue & Idempotency Guard
CREATE TABLE public.whatsapp_notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_status TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(order_id, order_status) -- Idempotency guard (Component 5)
);

-- RLS Policies
ALTER TABLE public.order_status_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON public.order_status_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to service role" ON public.order_status_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow read access to authenticated users" ON public.whatsapp_notification_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all access to service role" ON public.whatsapp_notification_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

