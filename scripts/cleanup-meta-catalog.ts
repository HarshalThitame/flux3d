/**
 * One-time Meta catalog reconciliation: removes catalog items that no longer
 * map to a live product in the database.
 *
 * Rules (matching the production sync policy):
 *   - Archived products (is_archived = true)  -> their items are DELETED
 *   - Inactive products (is_active = false, not archived) -> kept (staging)
 *   - Active products -> kept
 *   - Any catalog item whose retailer_id matches no DB product/SKU -> DELETED
 *
 * Run:
 *   npx tsx scripts/cleanup-meta-catalog.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  getMetaApiHeaders,
  getMetaCatalogId,
  getMetaGraphBase,
} from "@/lib/meta/config";
import { toCatalogRetailerId, deleteMetaCatalogItem } from "@/lib/meta/catalog";

dotenv.config({ path: ".env.local" });

type CatalogItem = { id?: string; retailer_id?: string; title?: string };

async function listCatalogItems(): Promise<CatalogItem[]> {
  const base = getMetaGraphBase();
  const catalogId = getMetaCatalogId();
  const headers = getMetaApiHeaders();
  const items: CatalogItem[] = [];
  let url: string | null =
    `${base}/${catalogId}/products?fields=id,retailer_id,title&limit=100`;
  let pages = 0;
  while (url && pages < 50) {
    pages += 1;
    const res = await fetch(url, { headers });
    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      throw new Error(`Meta list error: ${JSON.stringify(json)}`);
    }
    items.push(...((json.data as CatalogItem[]) ?? []));
    url =
      ((json.paging as Record<string, unknown> | undefined)?.next as
        string | undefined) ?? null;
    console.log(`  fetched page ${pages}: ${items.length} items so far`);
  }
  return items;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: products, error } = await supabase
    .from("shelf_products")
    .select("id, slug, is_active, is_archived, shelf_skus(sku_code)");

  if (error) throw new Error(`Product fetch failed: ${error.message}`);

  const validIds = new Set<string>();
  const archivedProductIds: string[] = [];
  let keptCount = 0;
  for (const product of products ?? []) {
    const skus =
      (product.shelf_skus as Array<{ sku_code: string }> | null) ?? [];
    if (product.is_archived) {
      archivedProductIds.push(product.id);
      continue;
    }
    keptCount += 1;
    if (skus.length > 0) {
      for (const sku of skus) validIds.add(toCatalogRetailerId(sku.sku_code));
    } else {
      validIds.add(toCatalogRetailerId(product.slug));
    }
  }

  console.log(
    `DB: ${products?.length ?? 0} products | kept (not archived): ${keptCount} | archived: ${archivedProductIds.length}`,
  );
  console.log(`Valid retailer_ids: ${validIds.size}`);

  const items = await listCatalogItems();
  console.log(`Meta catalog items: ${items.length}`);

  let deleted = 0;
  let kept = 0;
  let failed = 0;
  for (const item of items) {
    const retailerId = item.retailer_id;
    if (!retailerId) {
      // Items without a retailer_id cannot be matched — leave them alone.
      kept += 1;
      continue;
    }
    if (validIds.has(retailerId)) {
      kept += 1;
      continue;
    }
    const result = await deleteMetaCatalogItem(retailerId);
    if (result.success) {
      deleted += 1;
      console.log(`  deleted ${retailerId} (${item.title ?? ""})`);
    } else {
      failed += 1;
      console.log(`  FAILED ${retailerId}: ${result.error}`);
    }
  }

  if (archivedProductIds.length > 0) {
    const { error: updErr } = await supabase
      .from("shelf_products")
      .update({ meta_item_id: null, meta_sync_error: null })
      .in("id", archivedProductIds);
    if (updErr)
      console.error(`Failed to clear archived meta columns: ${updErr.message}`);
  }

  console.log(`\nSummary: deleted=${deleted} kept=${kept} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
