-- Add affects_images and image_priority to shelf_variant_options
ALTER TABLE public.shelf_variant_options
  ADD COLUMN IF NOT EXISTS affects_images BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_priority INTEGER;

COMMENT ON COLUMN public.shelf_variant_options.affects_images IS 'Determines whether changing this option updates the product image gallery.';
COMMENT ON COLUMN public.shelf_variant_options.image_priority IS 'Lower number = higher priority when resolving partial gallery matches.';

-- Set defaults for common options to avoid breaking existing setups
UPDATE public.shelf_variant_options 
SET affects_images = true, image_priority = 1
WHERE option_name ILIKE 'Color';

UPDATE public.shelf_variant_options 
SET affects_images = true, image_priority = 2
WHERE option_name ILIKE 'Finish';
