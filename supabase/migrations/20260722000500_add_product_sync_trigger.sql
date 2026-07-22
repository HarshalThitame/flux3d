-- Product/material change notification trigger for RAG knowledge sync
-- Fires pg_notify which Supabase Database Webhooks picks up and POSTs to
-- /api/webhooks/supabase-product-sync to refresh whatsapp_knowledge_chunks

CREATE OR REPLACE FUNCTION public.notify_product_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify(
    'product_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'event', TG_OP,
      'timestamp', NOW()::text
    )::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Notify on shelf_products changes
DROP TRIGGER IF EXISTS notify_shelf_products_changes ON public.shelf_products;
CREATE TRIGGER notify_shelf_products_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_products
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.notify_product_change();

-- Notify on materials changes
DROP TRIGGER IF EXISTS notify_materials_changes ON public.materials;
CREATE TRIGGER notify_materials_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.materials
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.notify_product_change();
