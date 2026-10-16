-- Invitation Studio: product-level configuration plus paid-sample credits.
-- All writes use service-role server code; anon/authenticated receive no access.

ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS invitation_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'enabled', false,
    'sampleSkuId', null,
    'minFinalQuantity', 25,
    'creditExpiryDays', 90,
    'fields', jsonb_build_array('hostNames', 'eventDate', 'venue', 'rsvp', 'wording')
  );

ALTER TABLE public.shelf_coupons
  ADD COLUMN IF NOT EXISTS applicable_products text[],
  ADD COLUMN IF NOT EXISTS sample_credit_id uuid;

CREATE TABLE IF NOT EXISTS public.shop_sample_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_order_id uuid NOT NULL UNIQUE REFERENCES public.shelf_orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.shelf_products(id) ON DELETE RESTRICT,
  coupon_id uuid UNIQUE REFERENCES public.shelf_coupons(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email text,
  min_final_quantity integer NOT NULL DEFAULT 25 CHECK (min_final_quantity > 0),
  expires_at timestamptz NOT NULL,
  redeemed_order_id uuid UNIQUE REFERENCES public.shelf_orders(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_sample_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_sample_credits FROM anon, authenticated;
GRANT ALL ON public.shop_sample_credits TO service_role;
CREATE INDEX IF NOT EXISTS shop_sample_credits_owner_user_active
  ON public.shop_sample_credits(owner_user_id, expires_at)
  WHERE redeemed_order_id IS NULL;
CREATE INDEX IF NOT EXISTS shop_sample_credits_owner_email_active
  ON public.shop_sample_credits(lower(owner_email), expires_at)
  WHERE redeemed_order_id IS NULL;

CREATE OR REPLACE FUNCTION public.issue_invitation_sample_credit(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.shelf_orders%ROWTYPE;
  v_item jsonb;
  v_product public.shelf_products%ROWTYPE;
  v_code text;
  v_credit_id uuid;
  v_coupon_id uuid;
  v_amount_paise bigint;
  v_expiry_days integer;
  v_min_quantity integer;
BEGIN
  SELECT * INTO v_order FROM public.shelf_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR lower(coalesce(v_order.payment_status, '')) NOT IN ('paid', 'captured') THEN
    RETURN jsonb_build_object('issued', false);
  END IF;

  SELECT id, code INTO v_credit_id, v_code
  FROM public.shop_sample_credits WHERE sample_order_id = p_order_id;
  IF FOUND THEN
    RETURN jsonb_build_object('issued', true, 'creditId', v_credit_id, 'code', v_code);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) LOOP
    v_product := NULL;
    SELECT * INTO v_product FROM public.shelf_products WHERE id = (v_item->>'productId')::uuid;
    IF FOUND AND coalesce((v_product.invitation_config->>'enabled')::boolean, false)
      AND coalesce(v_product.invitation_config->>'sampleSkuId', '') <> ''
      AND coalesce(v_product.invitation_config->>'sampleSkuId', '') = v_item->>'skuId' THEN
      v_amount_paise := round((v_item->>'unitPrice')::numeric * 100)::bigint;
      v_expiry_days := greatest(1, least(365, coalesce((v_product.invitation_config->>'creditExpiryDays')::integer, 90)));
      v_min_quantity := greatest(1, coalesce((v_product.invitation_config->>'minFinalQuantity')::integer, 25));
      v_code := 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
      INSERT INTO public.shop_sample_credits (
        sample_order_id, product_id, code, amount_paise, owner_user_id, owner_email,
        min_final_quantity, expires_at
      ) VALUES (
        p_order_id, v_product.id, v_code, v_amount_paise, v_order.user_id,
        lower(nullif(v_order.guest_contact->>'email', '')), v_min_quantity, now() + make_interval(days => v_expiry_days)
      ) RETURNING id INTO v_credit_id;

      INSERT INTO public.shelf_coupons (
        code, discount_type, discount_value, min_order_value, max_uses, used_count,
        valid_from, valid_until, is_active, applicable_products, sample_credit_id
      ) VALUES (
        v_code, 'flat', v_amount_paise / 100.0, 0, 1, 0, current_date,
        current_date + v_expiry_days, true, ARRAY[v_product.id::text], v_credit_id
      ) RETURNING id INTO v_coupon_id;

      UPDATE public.shop_sample_credits SET coupon_id = v_coupon_id WHERE id = v_credit_id;
      RETURN jsonb_build_object('issued', true, 'creditId', v_credit_id, 'code', v_code);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('issued', false);
END;
$$;

REVOKE ALL ON FUNCTION public.issue_invitation_sample_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_invitation_sample_credit(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_sample_credit_redeemed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_table = 'shelf_coupons' THEN
    UPDATE public.shop_sample_credits credit
    SET redeemed_order_id = NEW.order_id, redeemed_at = now()
    FROM public.shelf_coupons coupon
    WHERE coupon.id = NEW.promotion_id
      AND coupon.sample_credit_id = credit.id
      AND credit.redeemed_order_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_sample_credit_redeemed_on_reservation ON public.shop_promotion_reservations;
CREATE TRIGGER mark_sample_credit_redeemed_on_reservation
  AFTER INSERT ON public.shop_promotion_reservations
  FOR EACH ROW EXECUTE FUNCTION public.mark_sample_credit_redeemed();

REVOKE ALL ON FUNCTION public.mark_sample_credit_redeemed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_sample_credit_redeemed() TO service_role;

-- A cancelled final order releases its promotion reservation. Re-open the
-- matching sample credit as well, so the customer can use it on a replacement
-- order rather than losing the credit to a failed/cancelled checkout.
CREATE OR REPLACE FUNCTION public.release_sample_credit_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_status = 'cancelled' AND OLD.order_status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.shop_sample_credits
    SET redeemed_order_id = NULL, redeemed_at = NULL
    WHERE redeemed_order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_sample_credit_on_order_cancel ON public.shelf_orders;
CREATE TRIGGER release_sample_credit_on_order_cancel
  AFTER UPDATE OF order_status ON public.shelf_orders
  FOR EACH ROW EXECUTE FUNCTION public.release_sample_credit_on_order_cancel();

REVOKE ALL ON FUNCTION public.release_sample_credit_on_order_cancel() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_sample_credit_on_order_cancel() TO service_role;
