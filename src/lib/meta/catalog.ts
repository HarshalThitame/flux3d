import { createHash } from "node:crypto";
import {
  getMetaApiHeaders,
  getMetaCatalogId,
  getMetaGraphBase,
} from "./config";
import type {
  MetaBatchRequestEntry,
  MetaCatalogItemData,
  ProductSyncAction,
  ProductSyncResult,
} from "./types";

/**
 * Meta's items_batch `id` / `retailer_id` field has a hard 100-character limit.
 * Some SKU codes (e.g. RGB Lotus lamp) exceed this and were silently dropped by
 * Meta, so those products never appeared in the WhatsApp catalog. We shorten
 * over-length ids deterministically (stable across syncs) while preserving the
 * full sku_code in `custom_label_4` for reverse lookups.
 */
export const CATALOG_ID_MAX = 100;

export function toCatalogRetailerId(id: string): string {
  if (!id) return id;
  if (id.length <= CATALOG_ID_MAX) return id;
  const hash = createHash("sha256").update(id).digest("hex").slice(0, 12);
  return `${id.slice(0, CATALOG_ID_MAX - hash.length - 1)}-${hash}`;
}

type ProductSkuInput = {
  id: string;
  sku_code: string;
  price: number;
  stock_quantity: number;
  is_available: boolean | null;
  variant_combination: Record<string, string | boolean>;
  variant_image_url: string | null;
};

type ProductInput = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  image_urls: string[] | null;
  is_active: boolean | null;
  is_archived: boolean | null;
  base_price: number;
  category_name?: string | null;
  skus?: ProductSkuInput[] | null;
};

function getGoogleProductCategory(categoryName: string | null | undefined): string {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("lamp") || cat.includes("light")) {
    return "Home & Garden > Lighting > Lamps";
  }
  if (cat.includes("planter") || cat.includes("pot") || cat.includes("vase")) {
    return "Home & Garden > Lawn & Garden > Gardening > Pots & Planters";
  }
  if (cat.includes("toy") || cat.includes("game")) {
    return "Toys & Games > Toys";
  }
  if (cat.includes("art") || cat.includes("sculpture")) {
    return "Arts & Entertainment > Hobbies & Creative Arts > Artwork";
  }
  if (cat.includes("jewelry") || cat.includes("keychain")) {
    return "Apparel & Accessories > Jewelry";
  }
  if (cat.includes("home") || cat.includes("decor")) {
    return "Home & Garden > Decor";
  }
  // Default for general 3D printed items if no specific category matched
  return "Home & Garden > Decor";
}

function buildCatalogItem(
  product: ProductInput,
  sku: ProductSkuInput,
): MetaCatalogItemData {
  const variantParts = Object.entries(sku.variant_combination ?? {}).map(
    ([k, v]) => `${k}:${v}`,
  );
  const variantLabel = variantParts.join(", ");
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://flux3d.in"
  ).replace(/\/+$/, "");
  const productUrl = `${baseUrl}/3d-shop/product/${product.slug}${sku.sku_code ? `?sku=${encodeURIComponent(sku.sku_code)}` : ""}`;
  const image =
    sku.variant_image_url ||
    product.thumbnail_url ||
    product.image_urls?.[0] ||
    undefined;
  // Meta limits `id`/`retailer_id` to 100 chars. Always send the shortened form,
  // and keep the full sku_code in custom_label_4 so catalog taps can be resolved
  // back to the DB sku (see mapCatalogItemToSku).
  const retailerId = toCatalogRetailerId(sku.sku_code);

  const availability: MetaCatalogItemData["availability"] =
    !product.is_active || product.is_archived
      ? "out of stock"
      : sku.stock_quantity > 0
        ? "in stock"
        : sku.is_available
          ? "preorder"
          : "out of stock";

  const item: MetaCatalogItemData = {
    id: retailerId,
    // Meta caps title at 150 chars and description at 5000 chars; anything
    // longer is rejected by the items_batch validation.
    title: (variantLabel
      ? `${product.name} — ${variantLabel}`
      : product.name
    ).slice(0, 150),
    description: product.description?.slice(0, 5000) || undefined,
    availability,
    condition: "new",
    price: `${(sku.price || product.base_price).toFixed(2)} INR`,
    link: productUrl,
    image_link: image,
    item_group_id: product.slug,
    visibility:
      product.is_active && !product.is_archived ? "published" : "staging",
    brand: "Flux3D",
    google_product_category: getGoogleProductCategory(product.category_name),
  };

  // Send every product image (besides the primary) so the WhatsApp catalog and
  // DPA ad creative can render rich galleries. Meta allows up to 10.
  const extraImages = (product.image_urls ?? [])
    .filter((url) => url && url !== image)
    .slice(0, 10);
  if (product.thumbnail_url && image !== product.thumbnail_url) {
    extraImages.unshift(product.thumbnail_url);
  }
  if (extraImages.length > 0) {
    item.additional_image_link = extraImages;
  }

  if (product.category_name) {
    item.custom_label_0 = product.category_name;
  }

  if (sku.stock_quantity >= 0) {
    item.inventory = sku.stock_quantity;
  }

  const color =
    sku.variant_combination?.color ?? sku.variant_combination?.Color;
  if (color) {
    item.color = String(color);
    item.custom_label_1 = `Color:${color}`;
  }

  const material =
    sku.variant_combination?.material ?? sku.variant_combination?.Material;
  if (material) {
    item.material = String(material);
    item.custom_label_2 = `Material:${material}`;
  }

  const size = sku.variant_combination?.size ?? sku.variant_combination?.Size;
  if (size) {
    item.size = String(size);
    item.custom_label_3 = `Size:${size}`;
  }

  item.custom_label_4 = `SKU:${sku.sku_code}`;

  return item;
}

// Stable hash of the exact payload we send to Meta. Two SKUs are identical for
// WhatsApp review purposes if (and only if) this hash matches, so the cron can
// skip re-pushing unchanged items and avoid re-triggering review churn.
export function computeCatalogItemHash(item: MetaCatalogItemData): string {
  const cleaned = Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined),
  );
  return createHash("sha256").update(JSON.stringify(cleaned)).digest("hex");
}

// ── Graph API transport with throttle handling ──────────────────────────────
// Meta rate-limits items_batch (HTTP 429, or HTTP 200-body error codes 4/613,
// or error code 130429). Without backoff a throttle storm burns through the
// whole catalog logging per-SKU failures without ever pausing.

export const META_MAX_REQUESTS_PER_BATCH = 1000;

const THROTTLE_RETRY_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ItemsBatchResult = {
  handles?: string[];
  validation_status?: {
    handles: Array<{ handle: string; errors?: Array<{ message: string }> }>;
  };
};

type PostResult =
  | { ok: true; result: ItemsBatchResult }
  | { ok: false; status?: number; error: string };

async function postItemsBatch(
  catalogId: string,
  headers: HeadersInit,
  requests: MetaBatchRequestEntry[],
): Promise<PostResult> {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    let response: Response;
    try {
      response = await fetch(`${getMetaGraphBase()}/${catalogId}/items_batch`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          allow_upsert: true,
          item_type: "PRODUCT_ITEM",
          requests,
        }),
      });
    } catch (err) {
      // Network errors: retry transiently like throttles
      if (attempt <= THROTTLE_RETRY_ATTEMPTS) {
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 15_000));
        continue;
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (response.ok) {
      const result = (await response
        .json()
        .catch(() => ({}))) as ItemsBatchResult;
      return { ok: true, result };
    }

    const errBody = await response.text().catch(() => "");
    const throttled =
      response.status === 429 ||
      /"code"\s*:\s*(4|613|130429|80004)\b/.test(errBody) ||
      /request limit/i.test(errBody);

    if (throttled && attempt <= THROTTLE_RETRY_ATTEMPTS) {
      const retryAfterHeader = Number(response.headers.get("retry-after"));
      const delayMs =
        Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? Math.min(retryAfterHeader * 1000, 30_000)
          : Math.min(1000 * 2 ** (attempt - 1), 15_000);
      console.warn(
        `[meta/catalog] Graph API throttle (${response.status}); backing off ${delayMs}ms`,
      );
      await sleep(delayMs);
      continue;
    }

    return {
      ok: false,
      status: response.status,
      error: `${response.status}: ${errBody}`,
    };
  }
}

export type CatalogEntry = {
  retailerId: string;
  data: MetaCatalogItemData;
  hash: string;
};

export function buildCatalogEntries(product: ProductInput): CatalogEntry[] {
  if (!product.skus?.length) {
    const retailerId = toCatalogRetailerId(product.slug);
    const data = buildCatalogItem(product, {
      id: product.id,
      sku_code: product.slug,
      price: product.base_price,
      stock_quantity: 0,
      is_available: product.is_active,
      variant_combination: {},
      variant_image_url: null,
    });
    return [{ retailerId, data, hash: computeCatalogItemHash(data) }];
  }

  return product.skus.map((sku) => {
    const data = buildCatalogItem(product, sku);
    return {
      retailerId: toCatalogRetailerId(sku.sku_code),
      data,
      hash: computeCatalogItemHash(data),
    };
  });
}

export async function upsertMetaCatalogItem(
  product: ProductInput,
): Promise<ProductSyncAction[]> {
  const catalogId = getMetaCatalogId();
  const headers = getMetaApiHeaders();
  const actions: ProductSyncAction[] = [];
  const entries = buildCatalogEntries(product).map((entry) => ({
    method: "UPDATE" as const,
    retailer_id: entry.retailerId,
    data: entry.data,
  }));

  // Meta caps items_batch at ~1000 requests per call; chunk defensively so a
  // SKU-heavy product cannot silently exceed the limit.
  for (
    let offset = 0;
    offset < entries.length;
    offset += META_MAX_REQUESTS_PER_BATCH
  ) {
    const chunk = entries.slice(offset, offset + META_MAX_REQUESTS_PER_BATCH);
    const postResult = await postItemsBatch(catalogId, headers, chunk);

    if (!postResult.ok) {
      chunk.forEach((entry) => {
        actions.push({
          productId: product.id,
          skuCode: entry.retailer_id,
          action: "upsert",
          success: false,
          error: `Meta API error ${postResult.error}`,
        });
      });
      continue;
    }

    const result = postResult.result;
    const validationHandles = result.validation_status?.handles ?? [];

    chunk.forEach((entry, index) => {
      const handle = result.handles?.[index];
      const error = validationHandles[index]?.errors?.[0]?.message as
        string | undefined;
      actions.push({
        productId: product.id,
        skuCode: entry.retailer_id,
        action: "upsert",
        success: !error,
        error,
        metaHandle: handle,
      });
    });
  }

  return actions;
}

export async function deleteMetaCatalogItem(
  retailerId: string,
): Promise<ProductSyncAction> {
  const catalogId = getMetaCatalogId();
  const headers = getMetaApiHeaders();
  // Catalog items are keyed by toCatalogRetailerId(sku_code/slug), so the
  // delete must use the SAME shortened id — a raw >100-char sku_code would
  // never match and the stale item would linger in the catalog forever.
  const catalogRetailerId = toCatalogRetailerId(retailerId);

  const entry: MetaBatchRequestEntry = {
    method: "DELETE",
    retailer_id: catalogRetailerId,
  };

  const postResult = await postItemsBatch(catalogId, headers, [entry]);

  if (!postResult.ok) {
    return {
      productId: retailerId,
      skuCode: retailerId,
      action: "delete",
      success: false,
      error: `Meta API error ${postResult.error}`,
    };
  }

  const result = postResult.result;
  const error = result.validation_status?.handles?.[0]?.errors?.[0]?.message;
  // "Item not found" means the item is already gone — treat as success so the
  // caller stops retrying instead of re-queuing a non-existent delete forever.
  const alreadyGone =
    !error || /does not exist|not found|no longer exists/i.test(error);

  return {
    productId: retailerId,
    skuCode: retailerId,
    action: "delete",
    success: alreadyGone,
    error: alreadyGone ? undefined : error,
    metaHandle: result.handles?.[0],
  };
}

export type StoredCatalogHashes = Record<string, string>;

export type SyncFullCatalogResult = ProductSyncResult & {
  skipped: number;
  hashes: StoredCatalogHashes;
};

/**
 * Change-aware full catalog sync.
 *
 * Pass the previously stored per-SKU payload hashes (keyed by sku_code/slug).
 * Any item whose computed hash matches the stored one is left untouched so the
 * periodic cron does NOT re-trigger WhatsApp review on unchanged items (which
 * was flipping APPROVED items to OUTDATED/NO_REVIEW and hiding the catalog).
 *
 * Returns the map of sku_code -> current hash that the caller should persist.
 */
export async function syncFullCatalogToMeta(
  products: ProductInput[],
  storedHashes: StoredCatalogHashes = {},
): Promise<SyncFullCatalogResult> {
  const startedAt = Date.now();
  const allActions: ProductSyncAction[] = [];
  const hashes: StoredCatalogHashes = {};
  let skipped = 0;

  for (const product of products) {
    const entries = buildCatalogEntries(product);

    // Archived products are permanently removed from the Meta catalog. Pushing
    // them with visibility:'staging' leaves stale items that still surface in
    // Commerce Manager / WhatsApp catalog admin, so delete them instead and
    // prune their hashes so the next run doesn't treat them as known-good.
    if (product.is_archived) {
      for (const entry of entries) {
        const result = await deleteMetaCatalogItem(entry.retailerId);
        allActions.push(result);
        delete hashes[entry.retailerId];
      }
      continue;
    }

    // A product created without SKUs gets a slug-based catalog entry. Once SKUs
    // are added, that slug entry is orphaned forever (nothing references it),
    // so delete it on first sight and prune its hash.
    const slugRetailerId = toCatalogRetailerId(product.slug);
    const hasSkus = (product.skus?.length ?? 0) > 0;
    if (hasSkus && storedHashes[slugRetailerId]) {
      const result = await deleteMetaCatalogItem(slugRetailerId);
      allActions.push(result);
      delete hashes[slugRetailerId];
    }

    const changed: CatalogEntry[] = [];
    for (const entry of entries) {
      if (storedHashes[entry.retailerId] === entry.hash) {
        skipped += 1;
        // Preserve the hash for unchanged items so the persisted map stays whole.
        hashes[entry.retailerId] = entry.hash;
      } else {
        changed.push(entry);
      }
    }

    if (changed.length === 0) continue;

    const actions = await upsertMetaCatalogItem(product);
    allActions.push(...actions);

    // Persist the hash ONLY for items that actually synced successfully.
    // Previously the hash was recorded for every changed entry regardless of
    // outcome, so a Meta rejection (e.g. a retailer_id over 100 chars) was
    // silently "skipped" on every future run and never retried — permanently
    // hiding the product from the WhatsApp catalog.
    const succeededSkus = new Set(
      actions.filter((a) => a.success).map((a) => a.skuCode),
    );
    for (const entry of changed) {
      if (succeededSkus.has(entry.retailerId)) {
        hashes[entry.retailerId] = entry.hash;
      }
    }
  }

  return {
    total: allActions.length,
    succeeded: allActions.filter((a) => a.success).length,
    failed: allActions.filter((a) => !a.success).length,
    actions: allActions,
    durationMs: Date.now() - startedAt,
    skipped,
    hashes,
  };
}
