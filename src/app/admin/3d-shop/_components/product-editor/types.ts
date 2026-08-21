import type { ShopProduct, ShopSku, ShopVariantOption } from '@/lib/shop/admin-types'
import type { ProductForm } from '@/lib/shop/product-schema'

export type { ProductForm }

export type DraftVariant = ShopVariantOption & {
  dirty?: boolean
}

export type DraftSku = ShopSku & {
  dirty?: boolean
}

export type UploadState = Record<string, { status: 'uploading' | 'done' | 'error'; progress: number }>

export type SaveStatus = 'draft' | 'publish'

export const emptyProduct: ProductForm = {
  name: '',
  slug: '',
  description: '',
  long_description: '',
  category_id: '',
  tags: [],
  occasion_tags: [],
  thumbnail_url: '',
  image_urls: [],
  image_alt: {},
  default_dimensions: null,
  model_url: '',
  base_price: 0,
  is_customizable: false,
  customization_label: '',
  is_featured: false,
  is_active: false,
  is_archived: false,
  meta_title: '',
  meta_description: '',
  published_at: null,
}

export const occasionTags = [
  'Diwali',
  'Eid',
  'Christmas',
  'Birthday',
  'Anniversary',
  'Gaming Setup',
  'Office Desk',
  'Home Decor',
  'Wedding Gift',
]

export const presetOptionNames = ['Size', 'Color', 'Material', 'Finish', 'Style', 'Pack Size', 'LED', 'Engraving', 'Custom...']
export const optionTypes: ShopVariantOption['option_type'][] = ['button', 'swatch_color', 'dropdown', 'toggle', 'text_input']

export function toProductForm(product: ShopProduct): ProductForm {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    long_description: product.long_description ?? '',
    category_id: product.category_id ?? '',
    tags: product.tags ?? [],
    occasion_tags: product.occasion_tags ?? [],
    thumbnail_url: product.thumbnail_url ?? '',
    image_urls: product.image_urls ?? [],
    image_alt: product.image_alt ?? {},
    default_dimensions: product.default_dimensions ?? null,
    model_url: product.model_url ?? '',
    base_price: Number(product.base_price ?? 0),
    is_customizable: product.is_customizable ?? false,
    customization_label: product.customization_label ?? '',
    is_featured: product.is_featured ?? false,
    is_active: product.is_active ?? false,
    is_archived: product.is_archived ?? false,
    meta_title: product.meta_title ?? '',
    meta_description: product.meta_description ?? '',
    published_at: product.published_at ?? null,
  }
}

export function getStatusLabel(product: ProductForm) {
  if (product.is_archived) return 'Archived'
  return product.is_active ? 'Published' : 'Draft'
}

export function getStatusClasses(product: ProductForm) {
  if (product.is_archived) return 'bg-rose-100 text-rose-700'
  return product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
}

export function comboLabel(combo: Record<string, string | boolean>) {
  const entries = Object.entries(combo)
  if (entries.length === 0) return 'Standard'
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

export function cartesianProduct(options: { name: string; values: string[] }[]) {
  if (options.length === 0) return [{}] as Record<string, string>[]
  return options.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((combo) =>
        option.values.map((value) => ({
          ...combo,
          [option.name]: value,
        }))
      ),
    [{}]
  )
}

export function imageList(product: ProductForm) {
  return [product.thumbnail_url, ...product.image_urls].filter(Boolean)
}

export function buildProductPayload(product: ProductForm, status?: SaveStatus): Record<string, unknown> {
  return {
    id: product.id,
    name: product.name.trim(),
    slug: product.slug.trim(),
    category_id: product.category_id || null,
    description: product.description,
    long_description: product.long_description,
    tags: product.tags,
    occasion_tags: product.occasion_tags,
    thumbnail_url: product.thumbnail_url || null,
    image_urls: product.image_urls,
    image_alt: product.image_alt,
    default_dimensions: product.default_dimensions ?? null,
    model_url: product.model_url || null,
    base_price: product.base_price,
    is_customizable: product.is_customizable,
    customization_label: product.customization_label,
    is_featured: product.is_featured,
    is_active: status === 'publish' ? true : status === 'draft' ? false : product.is_active,
    is_archived: product.is_archived,
    meta_title: product.meta_title,
    meta_description: product.meta_description,
    published_at: product.published_at || null,
  }
}
