ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS landmark text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.addresses
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.addresses
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS addresses_updated_at ON public.addresses;
CREATE TRIGGER addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DO $$
BEGIN
  IF to_regclass('public.delivery_addresses') IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, created_at)
    SELECT users.id, COALESCE(users.email, ''), now()
    FROM auth.users AS users
    WHERE EXISTS (
      SELECT 1
      FROM public.delivery_addresses AS delivery
      WHERE delivery.user_id = users.id
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.addresses (
      user_id,
      full_name,
      phone,
      address_line_1,
      address_line_2,
      city,
      state,
      pincode,
      country,
      landmark,
      is_default,
      created_at,
      updated_at
    )
    SELECT
      delivery.user_id,
      delivery.full_name,
      delivery.phone,
      delivery.address_line1,
      delivery.address_line2,
      delivery.city,
      delivery.state,
      delivery.pincode,
      'India',
      delivery.landmark,
      false,
      delivery.created_at,
      COALESCE(delivery.updated_at, delivery.created_at, now())
    FROM public.delivery_addresses AS delivery
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.addresses AS saved_address
      WHERE saved_address.user_id = delivery.user_id
        AND saved_address.full_name = delivery.full_name
        AND saved_address.phone = delivery.phone
        AND saved_address.address_line_1 = delivery.address_line1
        AND COALESCE(saved_address.address_line_2, '') = COALESCE(delivery.address_line2, '')
        AND saved_address.city = delivery.city
        AND saved_address.state = delivery.state
        AND saved_address.pincode = delivery.pincode
    );
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.delivery_addresses;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
