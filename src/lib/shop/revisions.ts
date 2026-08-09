import type { ProductForm } from '@/lib/shop/product-schema'
import type { ShopSku, ShopSkuImage, ShopVariantOption, ShopVariantOptionDimension, ShopVariantOptionImage } from '@/lib/shop/admin-types'

export type ShopRevision = {
  timestamp: number
  product: ProductForm
  variants: ShopVariantOption[]
  skus: ShopSku[]
  variant_dimensions?: ShopVariantOptionDimension[]
  variant_option_images?: ShopVariantOptionImage[]
  sku_images?: Record<string, ShopSkuImage[]>
}

const PREFIX = 'flux3d:shop-revision:'
const MAX_REVISIONS = 20

function storageKey(productId: string) {
  return PREFIX + (productId || 'draft')
}

export function loadRevisions(productId: string): ShopRevision[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(productId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ShopRevision[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRevision(productId: string, revision: ShopRevision): ShopRevision[] {
  if (typeof window === 'undefined') return loadRevisions(productId)
  const current = loadRevisions(productId)
  const last = current[current.length - 1]
  if (last && isSameState(last, revision)) return current
  const next = [...current, revision].slice(-MAX_REVISIONS)
  try {
    window.localStorage.setItem(storageKey(productId), JSON.stringify(next))
  } catch {
    // Storage unavailable or full — revisions are best-effort.
  }
  return next
}

export function clearRevisions(productId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(productId))
  } catch {
    // Ignore.
  }
}

export function deepStableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(deepStableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${deepStableStringify(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function isSameState(a: ShopRevision, b: ShopRevision) {
  const sameBase =
    deepStableStringify(a.product) === deepStableStringify(b.product) &&
    deepStableStringify(a.variants) === deepStableStringify(b.variants) &&
    deepStableStringify(a.skus) === deepStableStringify(b.skus)
  if (!sameBase) return false
  return (
    deepStableStringify(a.variant_dimensions ?? []) === deepStableStringify(b.variant_dimensions ?? []) &&
    deepStableStringify(a.variant_option_images ?? []) === deepStableStringify(b.variant_option_images ?? []) &&
    deepStableStringify(a.sku_images ?? []) === deepStableStringify(b.sku_images ?? [])
  )
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  slug: 'Slug',
  description: 'Short description',
  long_description: 'Long description',
  category_id: 'Category',
  base_price: 'Price',
  is_active: 'Status',
  is_featured: 'Featured',
  is_customizable: 'Customization',
  customization_label: 'Customization label',
  meta_title: 'Meta title',
  meta_description: 'Meta description',
  tags: 'Tags',
  occasion_tags: 'Occasion tags',
  thumbnail_url: 'Thumbnail',
  image_urls: 'Images',
  image_alt: 'Image alt text',
  model_url: '3D model',
  published_at: 'Schedule',
}

export function describeChanges(prev: ShopRevision, next: ShopRevision): string {
  const changed: string[] = []
  const keys = new Set([...Object.keys(prev.product), ...Object.keys(next.product)])
  for (const key of keys) {
    const a = prev.product[key as keyof ProductForm]
    const b = next.product[key as keyof ProductForm]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed.push(FIELD_LABELS[key] ?? key)
    }
  }
  const variantDelta = next.variants.length - prev.variants.length
  const skuDelta = next.skus.length - prev.skus.length
  if (variantDelta !== 0) {
    changed.push(`${Math.abs(variantDelta)} variant${Math.abs(variantDelta) === 1 ? '' : 's'} ${variantDelta > 0 ? 'added' : 'removed'}`)
  } else if (next.variants.some((variant, index) => deepStableStringify(variant) !== deepStableStringify(prev.variants[index]))) {
    changed.push('Variant options edited')
  }
  if (skuDelta !== 0) {
    changed.push(`${Math.abs(skuDelta)} SKU${Math.abs(skuDelta) === 1 ? '' : 's'} ${skuDelta > 0 ? 'added' : 'removed'}`)
  } else if (next.skus.some((sku, index) => deepStableStringify(sku) !== deepStableStringify(prev.skus[index]))) {
    changed.push('SKU values edited')
  }
  if (deepStableStringify(next.variant_dimensions ?? []) !== deepStableStringify(prev.variant_dimensions ?? [])) {
    changed.push('Dimensions edited')
  }
  if (
    deepStableStringify(next.variant_option_images ?? []) !== deepStableStringify(prev.variant_option_images ?? []) ||
    deepStableStringify(next.sku_images ?? []) !== deepStableStringify(prev.sku_images ?? [])
  ) {
    changed.push('Variant images edited')
  }
  return changed.join(', ') || 'Minor changes'
}
