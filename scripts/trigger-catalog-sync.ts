import { createClient } from "@supabase/supabase-js";
import { syncFullCatalogToMeta } from "../src/lib/meta/catalog";
import { getStoredCatalogHashes, saveStoredCatalogHashes } from "../src/lib/meta/sync-state";
import dotenv from "dotenv";

dotenv.config({ path: "../.env.local" });

async function run() {
  console.log("Starting forced Meta Catalog Sync...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("Fetching products...");
  const { data: rows, error } = await supabase
    .from("shelf_products")
    .select(`
      id, name, slug, description, thumbnail_url, image_urls,
      is_active, is_archived, base_price,
      category:category_id(name),
      skus:shelf_skus(id, sku_code, price, stock_quantity, is_available, variant_combination, variant_image_url)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch products:", error);
    return;
  }

  console.log(`Fetched ${rows.length} products.`);

  // Load hashes but we can pass an empty object to force a full re-sync
  // Since we changed google_product_category, we WANT to force re-sync!
  const storedHashes = {};
  console.log("Forcing full re-sync by ignoring stored hashes...");

  try {
    const result = await syncFullCatalogToMeta(rows as any, storedHashes);
    console.log("Sync complete!");
    console.log(`Total: ${result.total}, Succeeded: ${result.succeeded}, Failed: ${result.failed}, Skipped: ${result.skipped}`);

    if (result.hashes) {
      await saveStoredCatalogHashes(result.hashes);
      console.log("Hashes saved.");
    }
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

run();
