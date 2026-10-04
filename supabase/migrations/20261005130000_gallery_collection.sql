-- Public gallery collection. Images are stored in the existing, public
-- shop-images bucket; this table controls their editorial presentation.
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  description TEXT,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Studio work',
  materials TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_items_public_order_idx
  ON public.gallery_items (is_featured DESC, display_order ASC, created_at DESC)
  WHERE status = 'published';

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Explicit least-privilege grants: the public storefront can only read rows.
REVOKE ALL ON TABLE public.gallery_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.gallery_items TO anon, authenticated;

DROP POLICY IF EXISTS "gallery items public read" ON public.gallery_items;
CREATE POLICY "gallery items public read"
  ON public.gallery_items
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP TRIGGER IF EXISTS gallery_items_set_updated_at ON public.gallery_items;
CREATE TRIGGER gallery_items_set_updated_at
  BEFORE UPDATE ON public.gallery_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
