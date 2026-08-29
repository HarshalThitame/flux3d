-- ============================================================================
-- Harden variant / SKU image assignments
-- 1. Drop rows with empty image_url (these render as broken / alt-text-only).
-- 2. Deduplicate the same URL assigned to the same variant option, preserving
--    the is_primary flag across the collapsed group.
-- 3. Enforce unique assignments + non-empty image_url at the database level.
-- ============================================================================

-- 1. Remove broken rows
DELETE FROM public.shelf_variant_option_images
WHERE trim(image_url) = '';

DELETE FROM public.shelf_sku_images
WHERE trim(image_url) = '';

-- 2. Deduplicate variant option images, keeping the earliest row per
--    (product_id, option_name, option_value, image_url) and promoting
--    is_primary onto the survivor when any row in the group was primary.
WITH dedup AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id, option_name, option_value, image_url
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    MAX(is_primary::int) OVER (
      PARTITION BY product_id, option_name, option_value, image_url
    )::boolean AS group_primary
  FROM public.shelf_variant_option_images
)
UPDATE public.shelf_variant_option_images img
SET is_primary = dedup.group_primary
FROM dedup
WHERE img.id = dedup.id AND dedup.rn = 1 AND dedup.group_primary IS TRUE;

DELETE FROM public.shelf_variant_option_images
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY product_id, option_name, option_value, image_url
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM public.shelf_variant_option_images
  ) ranked
  WHERE rn > 1
);

-- 3. Constraints (idempotent — only add if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_variant_option_image'
      AND conrelid = 'public.shelf_variant_option_images'::regclass
  ) THEN
    ALTER TABLE public.shelf_variant_option_images
      ADD CONSTRAINT unique_variant_option_image
      UNIQUE (product_id, option_name, option_value, image_url);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_variant_option_image_url_not_empty'
      AND conrelid = 'public.shelf_variant_option_images'::regclass
  ) THEN
    ALTER TABLE public.shelf_variant_option_images
      ADD CONSTRAINT check_variant_option_image_url_not_empty
      CHECK (image_url IS NOT NULL AND trim(image_url) <> '');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_sku_image_url_not_empty'
      AND conrelid = 'public.shelf_sku_images'::regclass
  ) THEN
    ALTER TABLE public.shelf_sku_images
      ADD CONSTRAINT check_sku_image_url_not_empty
      CHECK (image_url IS NOT NULL AND trim(image_url) <> '');
  END IF;
END $$;