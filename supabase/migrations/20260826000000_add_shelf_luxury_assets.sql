-- ============================================================================
-- Ultra-Luxury PDP Assets
-- AR (iOS Quick Look) asset, interactive 3D hotspots, cinematic hero video,
-- and per-SKU 3D model overrides for variant-driven viewers.
-- ============================================================================

-- 1. USDZ model for iOS AR Quick Look ("View in your space")
ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS usdz_url TEXT;

COMMENT ON COLUMN public.shelf_products.usdz_url IS
  'USDZ asset for iOS AR Quick Look. Optional; AR button hidden when null.';

-- 2. Interactive 3D hotspots (storytelling annotations on the model)
ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS hotspots JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.shelf_products.hotspots IS
  'Array of { id, position:[x,y,z], label, description } in model local space. Max 12 enforced app-side.';

-- 3. Cinematic hero video (autoplay loop at top of PDP gallery)
ALTER TABLE public.shelf_products
  ADD COLUMN IF NOT EXISTS hero_video_url TEXT;

COMMENT ON COLUMN public.shelf_products.hero_video_url IS
  'MP4/WebM loop rendered as the lead media item on the PDP gallery.';

-- 4. Per-SKU 3D model override (variant-driven viewer; falls back to product model_url)
ALTER TABLE public.shelf_skus
  ADD COLUMN IF NOT EXISTS model_url TEXT;

COMMENT ON COLUMN public.shelf_skus.model_url IS
  'Optional GLB override shown in the PDP 3D viewer when this SKU is selected.';
