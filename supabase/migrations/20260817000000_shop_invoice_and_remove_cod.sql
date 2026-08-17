-- ============================================================
-- Shop invoice settings + remove Cash on Delivery (COD)
-- ============================================================

-- 1. Remove COD availability toggle (COD is no longer supported;
--    3D Shop orders are prepaid via Razorpay only).
ALTER TABLE public.business_settings
  DROP COLUMN IF EXISTS cod_available;

-- 2. Dedicated invoice prefix/start number for 3D Shop (shelf_orders)
--    invoices so admins can differentiate them from custom-order invoices.
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS shop_invoice_prefix TEXT DEFAULT 'SHP-';

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS shop_invoice_start_number INTEGER DEFAULT 1001;
