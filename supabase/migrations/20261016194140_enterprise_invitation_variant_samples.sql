-- Dedicated sample-to-final-SKU mappings. Existing sampleSkuId configurations
-- intentionally remain supported by the application as a legacy fallback.
ALTER TABLE public.shop_sample_credits
  ADD COLUMN IF NOT EXISTS sample_sku_id uuid REFERENCES public.shelf_skus(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS target_sku_id uuid REFERENCES public.shelf_skus(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reserved', 'redeemed', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS reserved_order_id uuid REFERENCES public.shelf_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz;

ALTER TABLE public.shop_sample_credits
  DROP CONSTRAINT IF EXISTS shop_sample_credits_sample_order_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS shop_sample_credits_sample_order_sku_unique
  ON public.shop_sample_credits(sample_order_id, sample_sku_id)
  WHERE sample_sku_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shop_sample_credits_one_active_target_per_owner
  ON public.shop_sample_credits(lower(owner_email), target_sku_id)
  WHERE status = 'active' AND target_sku_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS shop_sample_credits_auto_apply_lookup
  ON public.shop_sample_credits(lower(owner_email), status, expires_at, target_sku_id);

-- Keep the established atomic checkout implementation intact. Its v2 money
-- contract predates sampleCreditDiscountPaise, so a small compatibility
-- wrapper feeds the base function a reconciled legacy breakdown, then restores
-- the richer audited snapshot before the reservation trigger runs.
ALTER FUNCTION public.create_shelf_order_priced(uuid,text,jsonb,jsonb,jsonb,text,text,jsonb)
  RENAME TO create_shelf_order_priced_v2_base;
CREATE OR REPLACE FUNCTION public.create_shelf_order_priced(
  p_user_id uuid, p_order_number text, p_items jsonb, p_shipping_address jsonb,
  p_snapshot jsonb, p_fingerprint text, p_checkout_key text, p_metadata jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_base_snapshot jsonb := p_snapshot; v_credit bigint := coalesce((p_snapshot->'money'->>'sampleCreditDiscountPaise')::bigint,0); v_result jsonb;
BEGIN
  IF v_credit < 0 THEN RAISE EXCEPTION 'Invalid sample credit amount.'; END IF;
  IF v_credit > 0 THEN
    v_base_snapshot := jsonb_set(v_base_snapshot,'{money,couponDiscountPaise}',to_jsonb(((p_snapshot->'money'->>'couponDiscountPaise')::bigint+v_credit)));
  END IF;
  v_result := public.create_shelf_order_priced_v2_base(p_user_id,p_order_number,p_items,p_shipping_address,v_base_snapshot,p_fingerprint,p_checkout_key,p_metadata);
  UPDATE public.shelf_orders SET order_price_snapshot=p_snapshot, payment_snapshot=p_snapshot WHERE id=(v_result->>'orderId')::uuid;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.create_shelf_order_priced(uuid,text,jsonb,jsonb,jsonb,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_shelf_order_priced(uuid,text,jsonb,jsonb,jsonb,text,text,jsonb) TO service_role;

CREATE TABLE IF NOT EXISTS public.shop_sample_credit_reservations (
  order_id uuid NOT NULL REFERENCES public.shelf_orders(id) ON DELETE CASCADE,
  credit_id uuid NOT NULL REFERENCES public.shop_sample_credits(id) ON DELETE RESTRICT,
  discount_paise bigint NOT NULL CHECK (discount_paise > 0),
  captured_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, credit_id)
);
ALTER TABLE public.shop_sample_credit_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_sample_credit_reservations FROM anon, authenticated;
GRANT ALL ON public.shop_sample_credit_reservations TO service_role;

-- A snapshot is created server-side and this trigger re-locks every listed
-- credit. This prevents a second tab from spending the same variant credit.
CREATE OR REPLACE FUNCTION public.reserve_invitation_sample_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_credit jsonb; v_row public.shop_sample_credits%ROWTYPE; v_email text;
BEGIN
  IF NEW.order_price_snapshot IS NULL OR NEW.order_price_snapshot->'sample_credits' IS NULL THEN RETURN NEW; END IF;
  v_email := lower(coalesce(NEW.guest_contact->>'email', ''));
  FOR v_credit IN SELECT value FROM jsonb_array_elements(NEW.order_price_snapshot->'sample_credits') ORDER BY value->>'id' LOOP
    SELECT * INTO v_row FROM public.shop_sample_credits WHERE id=(v_credit->>'id')::uuid FOR UPDATE;
    IF NOT FOUND OR (v_row.status <> 'active' AND NOT (v_row.status='reserved' AND v_row.reserved_order_id=NEW.id)) OR v_row.expires_at <= now()
       OR v_row.target_sku_id IS DISTINCT FROM (v_credit->>'targetSkuId')::uuid
       OR v_row.owner_email IS DISTINCT FROM v_email THEN
      RAISE EXCEPTION 'A sample credit is no longer available. Refresh checkout.';
    END IF;
    UPDATE public.shop_sample_credits SET status='reserved', reserved_order_id=NEW.id, reserved_at=now()
      WHERE id=v_row.id AND status='active';
    INSERT INTO public.shop_sample_credit_reservations(order_id,credit_id,discount_paise)
      VALUES(NEW.id,v_row.id,(v_credit->>'discountPaise')::bigint)
      ON CONFLICT (order_id,credit_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS reserve_invitation_sample_credits_on_snapshot ON public.shelf_orders;
CREATE TRIGGER reserve_invitation_sample_credits_on_snapshot
  AFTER UPDATE OF order_price_snapshot ON public.shelf_orders
  FOR EACH ROW EXECUTE FUNCTION public.reserve_invitation_sample_credits();

CREATE OR REPLACE FUNCTION public.capture_invitation_sample_credits(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.shop_sample_credits credit SET status='redeemed', redeemed_order_id=p_order_id, redeemed_at=now()
  FROM public.shop_sample_credit_reservations reservation
  WHERE reservation.order_id=p_order_id AND reservation.credit_id=credit.id
    AND reservation.captured_at IS NULL AND reservation.released_at IS NULL;
  UPDATE public.shop_sample_credit_reservations SET captured_at=now()
    WHERE order_id=p_order_id AND captured_at IS NULL AND released_at IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.capture_invitation_sample_credits(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_invitation_sample_credits(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.release_reserved_invitation_sample_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.order_status='cancelled' AND OLD.order_status IS DISTINCT FROM 'cancelled')
    OR (NEW.payment_status IN ('failed','cancelled') AND OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    UPDATE public.shop_sample_credits credit SET status='active', reserved_order_id=NULL, reserved_at=NULL
      FROM public.shop_sample_credit_reservations reservation
      WHERE reservation.order_id=NEW.id AND reservation.credit_id=credit.id
        AND reservation.captured_at IS NULL AND reservation.released_at IS NULL;
    UPDATE public.shop_sample_credit_reservations SET released_at=now()
      WHERE order_id=NEW.id AND captured_at IS NULL AND released_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS release_reserved_invitation_sample_credits ON public.shelf_orders;
CREATE TRIGGER release_reserved_invitation_sample_credits
  AFTER UPDATE OF order_status, payment_status ON public.shelf_orders
  FOR EACH ROW EXECUTE FUNCTION public.release_reserved_invitation_sample_credits();

-- The payment-side capture call is deliberately idempotent and is made by
-- both the synchronous verification path and the gateway webhook path.

CREATE OR REPLACE FUNCTION public.issue_invitation_sample_credit(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.shelf_orders%ROWTYPE; v_item jsonb; v_product public.shelf_products%ROWTYPE;
  v_mapping jsonb; v_target_sku uuid; v_sample_sku uuid; v_email text; v_amount bigint;
  v_expiry integer; v_min integer; v_credit_id uuid; v_issued integer := 0;
BEGIN
  SELECT * INTO v_order FROM public.shelf_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR lower(coalesce(v_order.payment_status,'')) NOT IN ('paid','captured') THEN
    RETURN jsonb_build_object('issued',false);
  END IF;
  v_email := lower(coalesce(nullif(v_order.guest_contact->>'email',''),
    (SELECT email FROM public.profiles WHERE id=v_order.user_id LIMIT 1), ''));
  IF v_email='' THEN RETURN jsonb_build_object('issued',false); END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_order.items,'[]'::jsonb)) LOOP
    IF coalesce((v_item->'customizationData'->>'isSample')::boolean,false) IS NOT TRUE THEN CONTINUE; END IF;
    SELECT * INTO v_product FROM public.shelf_products WHERE id=(v_item->>'productId')::uuid;
    IF NOT FOUND OR coalesce((v_product.invitation_config->>'enabled')::boolean,false) IS NOT TRUE THEN CONTINUE; END IF;
    v_sample_sku := (v_item->>'skuId')::uuid;
    v_target_sku := NULLIF(v_item->'customizationData'->>'sampleForSkuId','')::uuid;
    SELECT value INTO v_mapping FROM jsonb_array_elements(coalesce(v_product.invitation_config->'sampleVariants','[]'::jsonb))
      WHERE value->>'sampleSkuId'=v_sample_sku::text AND value->>'finalSkuId'=v_target_sku::text LIMIT 1;
    -- Preserve existing generic-sample products until an admin creates mappings.
    IF v_mapping IS NULL AND v_product.invitation_config->>'sampleSkuId'=v_sample_sku::text THEN
      v_mapping := jsonb_build_object('finalSkuId',v_target_sku::text,'sampleSkuId',v_sample_sku::text);
    END IF;
    IF v_mapping IS NULL OR v_target_sku IS NULL THEN CONTINUE; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('sample-credit:'||v_email||':'||v_target_sku::text,0));
    IF EXISTS(SELECT 1 FROM public.shop_sample_credits WHERE lower(owner_email)=v_email AND target_sku_id=v_target_sku AND status IN ('active','reserved') AND expires_at>now()) THEN CONTINUE; END IF;
    v_amount := round((v_item->>'unitPrice')::numeric*100)::bigint;
    v_expiry := greatest(1,least(365,coalesce((v_mapping->>'creditExpiryDays')::integer,(v_product.invitation_config->>'creditExpiryDays')::integer,90)));
    v_min := greatest(1,coalesce((v_mapping->>'minFinalQuantity')::integer,(v_product.invitation_config->>'minFinalQuantity')::integer,25));
    INSERT INTO public.shop_sample_credits(sample_order_id,product_id,code,amount_paise,owner_user_id,owner_email,min_final_quantity,expires_at,sample_sku_id,target_sku_id,status)
      VALUES(p_order_id,v_product.id,'INV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),v_amount,v_order.user_id,v_email,v_min,now()+make_interval(days=>v_expiry),v_sample_sku,v_target_sku,'active')
      RETURNING id INTO v_credit_id;
    v_issued := v_issued+1;
  END LOOP;
  RETURN jsonb_build_object('issued',v_issued>0,'issuedCount',v_issued);
END; $$;
REVOKE ALL ON FUNCTION public.issue_invitation_sample_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_invitation_sample_credit(uuid) TO service_role;
