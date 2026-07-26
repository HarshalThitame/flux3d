-- Add 3D model URL to shelf products for the premium 3D shop viewer
ALTER TABLE public.shelf_products ADD COLUMN IF NOT EXISTS model_url TEXT;

COMMENT ON COLUMN public.shelf_products.model_url IS
  'URL to a 3D model file (GLB/GLTF preferred; STL/OBJ/3MF supported) used for interactive product preview.';
