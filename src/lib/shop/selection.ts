import type { ShopSku, ShopSkuImage, ShopVariantOption } from '@/lib/shop/admin-types'
import { resolveBoxDimensions, resolveDimensionsForSelection } from '@/lib/shop/dimensions'
import type { ShopPublicProduct } from '@/lib/shop/public-types'

export type ShopSelectedOptions = Record<string, string | boolean | null>

export function formatShopPrice(value: number | null | undefined) {
  return `₹${Math.round(Number(value ?? 0)).toLocaleString('en-IN')}`
}

export function normalizeShopNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function getShopProductImages(product: Pick<ShopPublicProduct, 'thumbnail_url' | 'image_urls'>) {
  return [product.thumbnail_url, ...(product.image_urls ?? [])].filter(Boolean) as string[]
}

export function getShopVariantOptionImages(
  product: Pick<ShopPublicProduct, 'variant_option_images'>,
  optionName: string,
  optionValue: string
) {
  return (product.variant_option_images ?? []).filter(
    (image) => image.option_name === optionName && image.option_value === optionValue
  )
}

export function getShopSkuImages(product: ShopPublicProduct, sku: ShopSku | null): ShopSkuImage[] {
  if (!sku) return []
  return (product.sku_images ?? {})[sku.id] ?? []
}

export type ShopGallerySource = 'option' | 'sku' | 'product'

export function getShopGalleryImages(
  product: ShopPublicProduct,
  selected: ShopSelectedOptions
): { images: string[]; caption?: string; source: ShopGallerySource } {
  for (const option of getSkuRelevantOptions(product.variant_options)) {
    const value = selected[option.option_name]
    if (typeof value !== 'string') continue
    const optionImages = getShopVariantOptionImages(product, option.option_name, value)
    if (optionImages.length > 0) {
      return {
        images: optionImages.map((image) => image.image_url),
        caption: `${option.option_name}: ${value}`,
        source: 'option',
      }
    }
  }

  const resolvedSku = resolveShopSku(product.skus, product.variant_options, selected)
  const skuImages = getShopSkuImages(product, resolvedSku)
  if (skuImages.length > 0) {
    return { images: skuImages.map((image) => image.image_url), source: 'sku' }
  }
  if (resolvedSku?.variant_image_url) {
    return { images: [resolvedSku.variant_image_url], source: 'sku' }
  }

  return { images: getShopProductImages(product), source: 'product' }
}

export function getShopDisplayDimensions(product: ShopPublicProduct, selected: ShopSelectedOptions) {
  return resolveDimensionsForSelection(
    product.variant_option_dimensions ?? [],
    product.default_dimensions ?? null,
    selected,
    product.variant_options
  )
}

export function getShopBoxDimensions(product: ShopPublicProduct, selected: ShopSelectedOptions) {
  return resolveBoxDimensions(
    product.variant_option_dimensions ?? [],
    product.box_dimensions ?? null,
    product.default_dimensions ?? null,
    selected
  )
}

export function shopVariantAffectsSku(option: ShopVariantOption) {
  return option.option_type !== 'toggle' && option.option_type !== 'text_input'
}

export function getSkuRelevantOptions(options: ShopVariantOption[]) {
  return options.filter(shopVariantAffectsSku)
}

export function hasUnselectedRequiredSkuOption(options: ShopVariantOption[], selected: ShopSelectedOptions) {
  return getSkuRelevantOptions(options).some((option) => option.is_required !== false && !selected[option.option_name])
}

export function shopSkuMatchesSelection(
  sku: ShopSku,
  options: ShopVariantOption[],
  selected: ShopSelectedOptions
) {
  const relevantOptions = getSkuRelevantOptions(options)
  if (relevantOptions.length === 0) return true

  return relevantOptions.every((option) => {
    const selectedValue = selected[option.option_name]
    if (!selectedValue) return false
    return sku.variant_combination?.[option.option_name] === selectedValue
  })
}

export function resolveShopSku(
  skus: ShopSku[],
  options: ShopVariantOption[],
  selected: ShopSelectedOptions
) {
  if (skus.length === 0) return null
  if (hasUnselectedRequiredSkuOption(options, selected)) return null

  const match = skus.find((sku) => shopSkuMatchesSelection(sku, options, selected))
  return match ?? null
}

export function formatVariantLabel(combo: Record<string, string | boolean> | null | undefined) {
  const entries = Object.entries(combo ?? {})
  if (entries.length === 0) return 'Standard'
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

export function getShopProductBadge(product: ShopPublicProduct) {
  if (product.is_new) return 'NEW'
  if (product.has_sale) return 'SALE'
  if (product.is_low_stock) return 'LOW STOCK'
  if (product.has_preorder) return 'PRE-ORDER'
  return null
}

export function getShopStockLabel(sku: ShopSku | null) {
  if (!sku) return { label: 'Select options', tone: 'muted' as const }
  if (sku.pre_order_eta) {
    return { label: `Pre-order · Ships by ${new Date(sku.pre_order_eta).toLocaleDateString('en-IN')}`, tone: 'blue' as const }
  }
  if (sku.stock_quantity <= 0) return { label: 'Out of Stock', tone: 'red' as const }
  if (sku.stock_quantity <= (sku.low_stock_threshold ?? 5)) return { label: `Only ${sku.stock_quantity} left`, tone: 'amber' as const }
  return { label: 'In Stock', tone: 'green' as const }
}
