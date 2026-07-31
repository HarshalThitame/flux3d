-- Meta catalog sync on shelf_skus changes
-- Mirrors the shelf_products_meta trigger: any INSERT/UPDATE/DELETE on shelf_skus
-- POSTs to /api/meta/catalog-sync so SKU-level changes (price, stock, availability,
-- variant data, deletion) reflect in the Meta catalog immediately.
--
-- supabase_functions.http_request builds the payload automatically:
--   { type, table, record, old_record, schema }

CREATE TRIGGER shelf_skus_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.shelf_skus
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://flux3d.in/api/meta/catalog-sync',
    'POST',
    '{"Content-type":"application/json","Authorization":"Bearer aded32727cf9c09b879bf999caa05bffcb22686402b61ff00a662e330ffca35f"}',
    '{}',
    '5000'
  );
