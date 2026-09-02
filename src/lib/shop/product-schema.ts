import { z } from "zod";
import type {
  ProductDimensions,
  ShopProductHotspot,
} from "@/lib/shop/admin-types";
import { descriptionBlocksSchema } from "@/lib/shop/blocks";

export const productHotspotSchema: z.ZodType<ShopProductHotspot> = z.object({
  id: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  label: z
    .string()
    .trim()
    .min(1, "Hotspot label is required")
    .max(80, "Keep hotspot labels under 80 characters"),
  description: z
    .string()
    .trim()
    .max(300, "Keep hotspot descriptions under 300 characters")
    .nullable()
    .optional(),
});

export const productHotspotsSchema = z
  .array(productHotspotSchema)
  .max(12, "Use at most 12 hotspots per product");

export const productDimensionsSchema: z.ZodType<ProductDimensions> = z.object({
  length_mm: z.number().min(0).nullable(),
  width_mm: z.number().min(0).nullable(),
  height_mm: z.number().min(0).nullable(),
  weight_g: z.number().min(0).nullable(),
  volume_cc: z.number().min(0).nullable(),
  dimension_unit: z.enum(["mm", "cm", "inch"]),
  weight_unit: z.enum(["g", "kg", "oz", "lb"]),
});

export const variantOptionTypeSchema = z.enum([
  "swatch_color",
  "button",
  "dropdown",
  "toggle",
  "text_input",
]);

export const variantValueMetadataSchema = z.object({
  swatch_image_url: z.string().nullable().optional(),
  hex_color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price_modifier: z.number().nullable().optional(),
  slug: z.string().nullable().optional(),
});

export const variantOptionSchema = z.object({
  id: z.string().optional(),
  option_name: z.string().trim().min(1, "Option name is required"),
  option_type: variantOptionTypeSchema,
  values: z.array(z.string().trim().min(1)).default([]),
  value_metadata: z.record(z.string(), variantValueMetadataSchema).default({}),
  display_order: z.number().int().min(0).optional(),
  is_required: z.boolean().optional(),
  affects_images: z.boolean().optional(),
  image_priority: z.number().int().min(1).nullable().optional(),
});

export const variantOptionsSchema = z.array(variantOptionSchema);

export const productFormSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(120, "Keep the product name under 120 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Product slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only",
    ),
  description: z
    .string()
    .max(200, "Short description must be 200 characters or fewer"),
  long_description: z.string(),
  long_description_blocks: descriptionBlocksSchema,
  category_id: z.string(),
  product_categories: z
    .array(z.object({ category_id: z.string(), is_primary: z.boolean() }))
    .optional(),
  tags: z.array(z.string()),
  occasion_tags: z.array(z.string()),
  thumbnail_url: z.string(),
  landscape_image_url: z.string(),
  image_urls: z.array(z.string()),
  image_alt: z.record(z.string(), z.string()),
  default_dimensions: productDimensionsSchema.nullable(),
  model_url: z.string(),
  usdz_url: z.string(),
  hotspots: productHotspotsSchema,
  hero_video_url: z.string(),
  base_price: z.number().min(0, "Price cannot be negative"),
  sku_pattern: z.string(),
  is_customizable: z.boolean(),
  customization_label: z.string(),
  customization_is_required: z.boolean(),
  customization_min_length: z.number().int().min(0),
  customization_max_length: z.number().int().min(1),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  is_archived: z.boolean(),
  meta_title: z.string().max(60, "Meta title should be under 60 characters"),
  meta_description: z
    .string()
    .max(160, "Meta description should be under 160 characters"),
  published_at: z.string().datetime({ offset: true }).nullable(),
});

export type ProductForm = z.infer<typeof productFormSchema>;

export type ProductFormErrors = Partial<Record<keyof ProductForm, string>>;

export function validateField<K extends keyof ProductForm>(
  key: K,
  value: ProductForm[K],
): string | undefined {
  const shape = productFormSchema.shape[key] as z.ZodType<unknown>;
  const result = shape.safeParse(value);
  if (!result.success) return result.error.issues[0]?.message;
  return undefined;
}

export function validateProduct(product: ProductForm): ProductFormErrors {
  const result = productFormSchema.safeParse(product);
  if (result.success) return {};
  const errors: ProductFormErrors = {};
  for (const issue of result.error.issues) {
    const pathKey = issue.path[0];
    if (typeof pathKey === "string" && !(pathKey in errors)) {
      errors[pathKey as keyof ProductForm] = issue.message;
    }
  }
  return errors;
}

export function getPublishBlockers(product: ProductForm): string[] {
  const blockers: string[] = [];
  if (!product.name.trim()) blockers.push("Add a product name");
  if (!product.slug.trim()) blockers.push("Add a product slug");
  if (!product.category_id) blockers.push("Assign a category");
  const hasBlocks =
    Array.isArray(product.long_description_blocks) &&
    product.long_description_blocks.length > 0;
  if (
    !product.description.trim() &&
    !product.long_description.trim() &&
    !hasBlocks
  ) {
    blockers.push("Add at least a short or detailed description");
  }
  if (product.base_price <= 0)
    blockers.push("Set a base price greater than zero");
  if (!product.thumbnail_url && product.image_urls.length === 0)
    blockers.push("Add at least one product image");
  const missingAlt = [product.thumbnail_url, ...product.image_urls].filter(
    (url) => url && !(product.image_alt[url] ?? "").trim(),
  );
  if (missingAlt.length > 0) {
    blockers.push(
      `Add alt text to ${missingAlt.length} image${missingAlt.length === 1 ? "" : "s"} for SEO & accessibility`,
    );
  }
  return blockers;
}
