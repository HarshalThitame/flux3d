import type { DescriptionBlocks } from "@/lib/shop/blocks";

export type DimensionUnit = "mm" | "cm" | "inch";
export type WeightUnit = "g" | "kg" | "oz" | "lb";

export type ProductDimensions = {
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  weight_g: number | null;
  volume_cc: number | null;
  dimension_unit: DimensionUnit;
  weight_unit: WeightUnit;
};

export type ShopVariantOptionDimension = {
  id: string;
  product_id: string;
  option_name: string;
  option_value: string;
  dimensions: ProductDimensions;
  created_at: string | null;
  updated_at: string | null;
};

export type ShopVariantOptionImage = {
  id: string;
  product_id: string;
  option_name: string;
  option_value: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string | null;
};

export type ShopSkuImage = {
  id: string;
  sku_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string | null;
};

// ============================================================================
// Luxury Variant & SKU System (AETHER) types
// ============================================================================

export type VariantValueMetadata = {
  swatch_image_url?: string | null;
  hex_color?: string | null;
  description?: string | null;
  price_modifier?: number | null;
  slug?: string | null;
};

export type SkuStatus =
  | "active"
  | "draft"
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "unavailable"
  | "made_to_order"
  | "limited_edition"
  | "discontinued";

export type PricingRuleType =
  "fixed_add" | "percent_add" | "fixed_override" | "multiply";

export type SkuPricingRuleCondition = Record<
  string,
  string | string[] | boolean
>;

export type ShopSkuPricingRule = {
  id: string;
  product_id: string;
  name: string;
  rule_type: PricingRuleType;
  conditions: SkuPricingRuleCondition;
  value: number;
  priority: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export const SKU_TIER_NAMES = ["Member", "VIP", "Wholesale"] as const;
export type SkuTierName = (typeof SKU_TIER_NAMES)[number];

export type ShopSkuTierPrice = {
  id: string;
  sku_id: string;
  tier_name: SkuTierName;
  price: number;
  created_at: string | null;
};

export type SkuPatternTemplate = {
  id: string;
  name: string;
  pattern: string;
  category_id: string | null;
  is_default: boolean;
  created_at: string | null;
};

export const SKU_PATTERN_TOKENS = [
  "{SLUG}",
  "{COLOR}",
  "{MATERIAL}",
  "{SIZE}",
  "{FINISH}",
  "{STYLE}",
  "{INFILL}",
  "{LAYER_HEIGHT}",
  "{BULB}",
  "{MOVEMENT}",
  "{INITIALS}",
] as const;

export type SkuPatternOption = {
  name: string;
  values: string[];
  metadata?: Record<string, VariantValueMetadata>;
  type?: string;
};

export type ShopProductHotspot = {
  id: string;
  position: [number, number, number];
  label: string;
  description?: string | null;
};

export type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_image_url: string | null;
  parent_category_id: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  product_count?: number;
  parent_name?: string | null;
};

export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  long_description_blocks: DescriptionBlocks | null;
  category_id: string | null;
  tags: string[] | null;
  occasion_tags: string[] | null;
  thumbnail_url: string | null;
  landscape_image_url: string | null;
  image_urls: string[] | null;
  image_alt: Record<string, string> | null;
  default_dimensions: ProductDimensions | null;
  model_url: string | null;
  usdz_url: string | null;
  hotspots: ShopProductHotspot[] | null;
  hero_video_url: string | null;
  base_price: number;
  sku_pattern: string | null;
  is_customizable: boolean | null;
  customization_label: string | null;
  customization_is_required: boolean | null;
  customization_min_length: number | null;
  customization_max_length: number | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  is_archived: boolean | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  category_name?: string | null;
  product_categories?: { category_id: string; is_primary: boolean }[] | null;
  categories?:
    { id: string; name: string; slug: string; is_primary: boolean }[] | null;
  sku_count?: number;
  stock_status?: "All In Stock" | "Some Low Stock" | "Out of Stock" | "No SKUs";
};

export type ShopVariantOption = {
  id: string;
  product_id: string;
  option_name: string;
  option_type: "swatch_color" | "button" | "dropdown" | "toggle" | "text_input";
  values: string[] | null;
  value_metadata?: Record<string, VariantValueMetadata> | null;
  display_order: number | null;
  is_required: boolean | null;
  affects_images: boolean | null;
  image_priority: number | null;
  created_at: string | null;
};

export type ShopSku = {
  id: string;
  product_id: string;
  sku_code: string;
  /**
   * The id used in the Meta (WhatsApp) catalog for this SKU. SKU codes over
   * Meta's 100-char retailer_id limit are shortened deterministically — pixel
   * / CAPI events must send THIS value as content_ids, never the raw sku_code.
   * Populated server-side in public-data normalizeSku().
   */
  catalog_retailer_id?: string;
  variant_combination: Record<string, string | boolean>;
  price: number;
  compare_at_price: number | null;
  cost_price?: number | null;
  status?: SkuStatus | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  weight_grams: number | null;
  variant_image_url: string | null;
  model_url: string | null;
  is_available: boolean | null;
  pre_order_eta: string | null;
  barcode?: string | null;
  qr_url?: string | null;
  tier_prices?: ShopSkuTierPrice[];
  created_at: string | null;
  updated_at: string | null;
};

export function slugifyShopValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stableStringify(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {}),
  );
}
