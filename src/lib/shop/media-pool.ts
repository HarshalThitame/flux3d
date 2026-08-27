import type {
  ShopSku,
  ShopSkuImage,
  ShopVariantOptionImage,
} from "@/lib/shop/admin-types";
import type { ProductForm } from "@/lib/shop/product-schema";

export type MediaVariantAssignment = {
  type: "variant_option";
  optionName: string;
  optionValue: string;
  imageId: string;
  isPrimary: boolean;
  displayOrder: number;
};

export type MediaSkuAssignment = {
  type: "sku";
  skuId: string;
  skuLabel: string;
  imageId: string;
  isPrimary: boolean;
  displayOrder: number;
};

export type MediaAssignment = MediaVariantAssignment | MediaSkuAssignment;

export type MediaPoolInput = {
  product: Pick<ProductForm, "thumbnail_url" | "image_urls" | "image_alt">;
  variantOptionImages: ShopVariantOptionImage[];
  skuImages: Record<string, ShopSkuImage[]>;
  skus: ShopSku[];
};

export type MediaItem = {
  id: string;
  url: string;
  alt: string;
  isCover: boolean;
  displayOrder: number;
  inProductGallery: boolean;
  variantOnly: boolean;
  assignments: MediaAssignment[];
};

export function skuLabel(
  combo: Record<string, string | boolean> | null | undefined,
) {
  const entries = Object.entries(combo ?? {});
  if (entries.length === 0) return "Standard";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

/**
 * Builds a single, deduplicated list of every image attached to a product
 * across all sources:
 *   1. product gallery (`thumbnail_url` + `image_urls`)
 *   2. variant option images (`shelf_variant_option_images`)
 *   3. per-SKU images (`shelf_sku_images`)
 *   4. each SKU's `variant_image_url`
 *
 * The same URL appearing in multiple places collapses into ONE tile carrying
 * assignment metadata, so the admin sees the full picture without duplicates.
 */
export function buildMediaPool(input: MediaPoolInput): MediaItem[] {
  const { product, variantOptionImages, skuImages, skus } = input;

  const byUrl = new Map<string, MediaItem>();
  const ordered: MediaItem[] = [];

  const ensure = (url: string): MediaItem => {
    const existing = byUrl.get(url);
    if (existing) return existing;
    const item: MediaItem = {
      id: url,
      url,
      alt: product.image_alt?.[url] ?? "",
      isCover: false,
      displayOrder: ordered.length,
      inProductGallery: false,
      variantOnly: true,
      assignments: [],
    };
    byUrl.set(url, item);
    ordered.push(item);
    return item;
  };

  const galleryUrls = [
    product.thumbnail_url,
    ...(product.image_urls ?? []),
  ].filter((url): url is string => Boolean(url));

  galleryUrls.forEach((url, index) => {
    const item = ensure(url);
    item.displayOrder = index;
    item.inProductGallery = true;
    item.variantOnly = false;
    item.isCover = url === product.thumbnail_url;
  });

  for (const image of variantOptionImages ?? []) {
    if (!image.image_url) continue;
    const item = ensure(image.image_url);
    item.assignments.push({
      type: "variant_option",
      optionName: image.option_name,
      optionValue: image.option_value,
      imageId: image.id,
      isPrimary: Boolean(image.is_primary),
      displayOrder: image.display_order ?? 0,
    });
    item.alt = image.alt_text ?? item.alt;
  }

  for (const sku of skus ?? []) {
    if (sku.variant_image_url) {
      const item = ensure(sku.variant_image_url);
      item.assignments.push({
        type: "sku",
        skuId: sku.id,
        skuLabel: skuLabel(sku.variant_combination),
        imageId: `variant_image_url:${sku.id}`,
        isPrimary: true,
        displayOrder: 0,
      });
    }
    for (const image of skuImages?.[sku.id] ?? []) {
      if (!image.image_url) continue;
      const item = ensure(image.image_url);
      item.assignments.push({
        type: "sku",
        skuId: sku.id,
        skuLabel: skuLabel(sku.variant_combination),
        imageId: image.id,
        isPrimary: Boolean(image.is_primary),
        displayOrder: image.display_order ?? 0,
      });
      item.alt = image.alt_text ?? item.alt;
    }
  }

  const inGallery = ordered.filter((item) => item.inProductGallery);
  const variantOnly = ordered.filter((item) => !item.inProductGallery);
  return [...inGallery, ...variantOnly].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

/** Human-readable summary of an item's assignments, e.g. "Color: Gold · Size: Large". */
export function mediaAssignmentsLabel(item: MediaItem) {
  const parts = item.assignments.map((assignment) =>
    assignment.type === "variant_option"
      ? `${assignment.optionName}: ${assignment.optionValue}`
      : assignment.skuLabel,
  );
  return parts.join(" · ");
}
