export type ShopCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  icon_emoji: string | null
  banner_image_url: string | null
  parent_category_id: string | null
  display_order: number | null
  is_active: boolean | null
  created_at: string | null
  product_count?: number
  parent_name?: string | null
}

export type ShopProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  long_description: string | null
  category_id: string | null
  tags: string[] | null
  occasion_tags: string[] | null
  thumbnail_url: string | null
  image_urls: string[] | null
  base_price: number
  is_customizable: boolean | null
  customization_label: string | null
  is_featured: boolean | null
  is_active: boolean | null
  is_archived: boolean | null
  meta_title: string | null
  meta_description: string | null
  created_at: string | null
  updated_at: string | null
  category_name?: string | null
  sku_count?: number
  stock_status?: 'All In Stock' | 'Some Low Stock' | 'Out of Stock' | 'No SKUs'
}

export type ShopVariantOption = {
  id: string
  product_id: string
  option_name: string
  option_type: 'swatch_color' | 'button' | 'dropdown' | 'toggle' | 'text_input'
  values: string[] | null
  display_order: number | null
  is_required: boolean | null
  created_at: string | null
}

export type ShopSku = {
  id: string
  product_id: string
  sku_code: string
  variant_combination: Record<string, string | boolean>
  price: number
  compare_at_price: number | null
  stock_quantity: number
  low_stock_threshold: number | null
  weight_grams: number | null
  variant_image_url: string | null
  is_available: boolean | null
  pre_order_eta: string | null
  created_at: string | null
  updated_at: string | null
}

export function slugifyShopValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function stableStringify(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = value[key]
        return acc
      }, {})
  )
}
