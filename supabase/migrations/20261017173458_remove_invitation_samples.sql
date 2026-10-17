-- Simplify Invitation Studio to final-card checkout plus customer-initiated
-- WhatsApp consultation. This project has confirmed there are no paid samples.
-- Do not apply this migration if any sample financial history exists.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.shop_sample_credits)
    OR EXISTS (SELECT 1 FROM public.shop_sample_credit_reservations)
    OR EXISTS (SELECT 1 FROM public.shelf_coupons WHERE sample_credit_id IS NOT NULL)
    OR EXISTS (
      SELECT 1
      FROM public.shelf_orders
      WHERE jsonb_path_exists(
        coalesce(items, '[]'::jsonb),
        '$[*] ? (@.customizationData.isSample == true)'
      )
    ) THEN
    RAISE EXCEPTION
      'Invitation sample data exists. Preserve financial history and perform a dedicated migration instead.';
  END IF;
END $$;

-- Convert existing product configuration in-place before removing the legacy
-- sample properties. minFinalQuantity becomes the simpler minOrderQuantity.
UPDATE public.shelf_products
SET invitation_config = (
  (invitation_config - 'sampleSkuId' - 'sampleVariants' - 'creditExpiryDays' - 'minFinalQuantity')
  || jsonb_build_object(
    'minOrderQuantity', greatest(
      1,
      coalesce(
        nullif(invitation_config->>'minOrderQuantity', '')::integer,
        nullif(invitation_config->>'minFinalQuantity', '')::integer,
        25
      )
    )
  )
)
WHERE invitation_config IS NOT NULL;

-- Auto-generated sample SKUs are identifiable by this private marker. They
-- have no order history because of the preflight above; unmarked SKUs remain.
DELETE FROM public.shelf_skus
WHERE variant_combination ? '__invitation_sample_for';

DROP TRIGGER IF EXISTS mark_sample_credit_redeemed_on_reservation
  ON public.shop_promotion_reservations;
DROP TRIGGER IF EXISTS release_sample_credit_on_order_cancel ON public.shelf_orders;
DROP TRIGGER IF EXISTS reserve_invitation_sample_credits_on_snapshot ON public.shelf_orders;
DROP TRIGGER IF EXISTS release_reserved_invitation_sample_credits ON public.shelf_orders;

DROP FUNCTION IF EXISTS public.mark_sample_credit_redeemed();
DROP FUNCTION IF EXISTS public.release_sample_credit_on_order_cancel();
DROP FUNCTION IF EXISTS public.reserve_invitation_sample_credits();
DROP FUNCTION IF EXISTS public.release_reserved_invitation_sample_credits();
DROP FUNCTION IF EXISTS public.capture_invitation_sample_credits(uuid);
DROP FUNCTION IF EXISTS public.issue_invitation_sample_credit(uuid);

DROP TABLE IF EXISTS public.shop_sample_credit_reservations;
DROP TABLE IF EXISTS public.shop_sample_credits;
ALTER TABLE public.shelf_coupons DROP COLUMN IF EXISTS sample_credit_id;

-- The sample-credit release wrapped the original atomic checkout function.
-- Restore that proven base function under its canonical name and retain its
-- server-only execution model.
DROP FUNCTION IF EXISTS public.create_shelf_order_priced(
  uuid, text, jsonb, jsonb, jsonb, text, text, jsonb
);
ALTER FUNCTION public.create_shelf_order_priced_v2_base(
  uuid, text, jsonb, jsonb, jsonb, text, text, jsonb
) RENAME TO create_shelf_order_priced;
REVOKE ALL ON FUNCTION public.create_shelf_order_priced(
  uuid, text, jsonb, jsonb, jsonb, text, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_shelf_order_priced(
  uuid, text, jsonb, jsonb, jsonb, text, text, jsonb
) TO service_role;
