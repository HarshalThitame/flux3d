import type {
  ShopSku,
  ShopSkuImage,
  ShopVariantOption,
} from "@/lib/shop/admin-types";
import { resolveDimensionsForSelection } from "@/lib/shop/dimensions";
import type { ShopPublicProduct } from "@/lib/shop/public-types";

export type ShopSelectedOptions = Record<string, string | boolean | null>;

export function formatShopPrice(value: number | null | undefined) {
  return `₹${Math.round(Number(value ?? 0)).toLocaleString("en-IN")}`;
}

export function normalizeShopNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/** Rejects empty strings, relative paths, and malformed URLs.
 *  Product images must be absolute URLs (Supabase Storage, CDN, data/blob). */
export function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url || !url.trim()) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getShopProductImages(
  product: Pick<ShopPublicProduct, "thumbnail_url" | "image_urls">,
) {
  const urls = [product.thumbnail_url, ...(product.image_urls ?? [])].filter(
    isValidImageUrl,
  );
  // Deduplicate thumbnail if it also appears in image_urls
  const seen = new Set<string>();
  return urls.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function getShopVariantOptionImages(
  product: Pick<ShopPublicProduct, "variant_option_images">,
  optionName: string,
  optionValue: string,
) {
  return (product.variant_option_images ?? []).filter(
    (image) =>
      image.option_name === optionName &&
      image.option_value === optionValue &&
      isValidImageUrl(image.image_url),
  );
}

export function getShopSkuImages(
  product: ShopPublicProduct,
  sku: ShopSku | null,
): ShopSkuImage[] {
  if (!sku) return [];
  return (
    (product.sku_images ?? {})[sku.id]?.filter((image) =>
      isValidImageUrl(image.image_url),
    ) ?? []
  );
}

export type ShopGallerySource = "option" | "sku" | "product";

/** Merge variant-specific shots ahead of the general product shots (deduped)
 *  so selecting a variant jumps to its images while every photo stays
 *  reachable by swiping — standard enterprise PDP behavior. */
function mergeGalleryWithProductImages(
  variantImages: string[],
  product: ShopPublicProduct,
) {
  const seen = new Set(variantImages);
  const merged = [...variantImages];
  for (const url of getShopProductImages(product)) {
    if (!seen.has(url)) {
      seen.add(url);
      merged.push(url);
    }
  }
  return merged;
}

export function getShopGalleryImages(
  product: ShopPublicProduct,
  selected: ShopSelectedOptions,
): { images: string[]; caption?: string; source: ShopGallerySource } {
  const allOptionUrls: string[] = [];
  const matchedCaptions: string[] = [];
  for (const option of getSkuRelevantOptions(product.variant_options)) {
    const value = selected[option.option_name];
    if (typeof value !== "string") continue;
    const optionImages = getShopVariantOptionImages(
      product,
      option.option_name,
      value,
    );
    if (optionImages.length > 0) {
      allOptionUrls.push(...optionImages.map((image) => image.image_url));
      matchedCaptions.push(`${option.option_name}: ${value}`);
    }
  }

  if (allOptionUrls.length > 0) {
    const seen = new Set<string>();
    const deduped = allOptionUrls.filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
    return {
      images: mergeGalleryWithProductImages(deduped, product),
      caption: matchedCaptions.join(" · "),
      source: "option",
    };
  }

  const resolvedSku = resolveShopSku(
    product.skus,
    product.variant_options,
    selected,
  );
  const skuImages = getShopSkuImages(product, resolvedSku);
  const validVariantImage = isValidImageUrl(resolvedSku?.variant_image_url)
    ? resolvedSku.variant_image_url
    : null;
  let variantSpecific: string[] | null = null;
  if (skuImages.length > 0) {
    variantSpecific = validVariantImage
      ? [
          validVariantImage,
          ...skuImages
            .map((image) => image.image_url)
            .filter((url) => url !== validVariantImage),
        ]
      : skuImages.map((image) => image.image_url);
  } else if (validVariantImage) {
    variantSpecific = [validVariantImage];
  }

  if (variantSpecific && variantSpecific.length > 0) {
    return {
      images: mergeGalleryWithProductImages(variantSpecific, product),
      source: "sku",
    };
  }

  return { images: getShopProductImages(product), source: "product" };
}

/**
 * Default pre-selected options: the cheapest purchasable SKU's combination.
 * Preference order: in-stock → available (pre-order etc.) → any. Falls back
 * to an empty selection when no SKU exists.
 */
export function getDefaultShopSelection(
  product: Pick<ShopPublicProduct, "skus" | "variant_options">,
): ShopSelectedOptions {
  const relevantOptions = getSkuRelevantOptions(product.variant_options);
  if (relevantOptions.length === 0 || product.skus.length === 0) return {};

  const rank = (sku: ShopSku) => {
    if (sku.is_available === false) return 3;
    if (sku.stock_quantity > 0) return 0;
    if (sku.pre_order_eta) return 1;
    return 2;
  };
  const candidates = [...product.skus].sort(
    (a, b) => rank(a) - rank(b) || a.price - b.price,
  );
  const best = candidates[0];

  const selected: ShopSelectedOptions = {};
  for (const option of relevantOptions) {
    const value = best.variant_combination?.[option.option_name];
    if (typeof value === "string" && value)
      selected[option.option_name] = value;
  }
  // Only return a selection when it resolves to a real SKU (avoids landing
  // on an invalid partial combination).
  return Object.keys(selected).length > 0 ? selected : {};
}

export function getShopDisplayDimensions(
  product: ShopPublicProduct,
  selected: ShopSelectedOptions,
) {
  return resolveDimensionsForSelection(
    product.variant_option_dimensions ?? [],
    product.default_dimensions ?? null,
    selected,
    product.variant_options,
  );
}

export function shopVariantAffectsSku(option: ShopVariantOption) {
  return option.option_type !== "toggle" && option.option_type !== "text_input";
}

export function getSkuRelevantOptions(options: ShopVariantOption[]) {
  return options.filter(shopVariantAffectsSku);
}

export function hasUnselectedRequiredSkuOption(
  options: ShopVariantOption[],
  selected: ShopSelectedOptions,
) {
  return getSkuRelevantOptions(options).some(
    (option) => option.is_required !== false && !selected[option.option_name],
  );
}

export function shopSkuMatchesSelection(
  sku: ShopSku,
  options: ShopVariantOption[],
  selected: ShopSelectedOptions,
) {
  const relevantOptions = getSkuRelevantOptions(options);
  if (relevantOptions.length === 0) return true;

  return relevantOptions.every((option) => {
    const selectedValue = selected[option.option_name];
    if (!selectedValue) return false;
    return sku.variant_combination?.[option.option_name] === selectedValue;
  });
}

export function resolveShopSku(
  skus: ShopSku[],
  options: ShopVariantOption[],
  selected: ShopSelectedOptions,
) {
  if (skus.length === 0) return null;
  if (hasUnselectedRequiredSkuOption(options, selected)) return null;

  const match = skus.find((sku) =>
    shopSkuMatchesSelection(sku, options, selected),
  );
  return match ?? null;
}

export function formatVariantLabel(
  combo: Record<string, string | boolean> | null | undefined,
) {
  const entries = Object.entries(combo ?? {});
  if (entries.length === 0) return "Standard";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

/**
 * Returns the currently selected swatch color (CSS color string) so the 3D
 * viewer can live-tint the model when a color variant changes.
 */
export function getSelectedSwatchColor(
  options: ShopVariantOption[],
  selected: ShopSelectedOptions,
): string | null {
  for (const option of options) {
    if (option.option_type !== "swatch_color") continue;
    const value = selected[option.option_name];
    if (typeof value !== "string" || !value.trim()) continue;
    const meta = option.value_metadata?.[value];
    if (meta?.hex_color) return meta.hex_color;
    return value.trim();
  }
  return null;
}

export function getShopProductBadge(product: ShopPublicProduct) {
  if (product.is_new) return "NEW";
  if (product.has_sale) return "SALE";
  if (product.is_low_stock) return "LOW STOCK";
  if (product.has_preorder) return "PRE-ORDER";
  return null;
}

export function getShopStockLabel(sku: ShopSku | null) {
  if (!sku) return { label: "Select options", tone: "muted" as const };
  if (isSkuBlockedByStatus(sku)) {
    return { label: "Out of Stock", tone: "red" as const };
  }
  if (sku.pre_order_eta) {
    return {
      label: `Pre-order · Ships by ${new Date(sku.pre_order_eta).toLocaleDateString("en-IN")}`,
      tone: "blue" as const,
    };
  }
  if (sku.stock_quantity <= 0)
    return { label: "Out of Stock", tone: "red" as const };
  if (sku.stock_quantity <= (sku.low_stock_threshold ?? 5))
    return { label: `Only ${sku.stock_quantity} left`, tone: "amber" as const };
  return { label: "In Stock", tone: "green" as const };
}

/**
 * Editorial statuses that must block purchase even if stock_quantity is
 * positive: out_of_stock, unavailable, discontinued and draft.
 * Also blocks SKUs whose availability is undecided (is_available IS NULL →
 * draft) or explicitly disabled (is_available = false → unavailable), so the
 * storefront stays consistent with deriveSkuStatus used in the admin.
 */
export function isSkuBlockedByStatus(sku: ShopSku | null): boolean {
  if (!sku) return false;
  if (sku.is_available == null) return true;
  if (sku.is_available === false) return true;
  const status = sku.status;
  if (!status) return false;
  return (
    status === "out_of_stock" ||
    status === "unavailable" ||
    status === "discontinued" ||
    status === "draft"
  );
}
