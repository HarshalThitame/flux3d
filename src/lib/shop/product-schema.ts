import { z } from 'zod'
import type { ProductDimensions } from '@/lib/shop/admin-types'

export const productDimensionsSchema: z.ZodType<ProductDimensions> = z.object({
  length_mm: z.number().min(0).nullable(),
  width_mm: z.number().min(0).nullable(),
  height_mm: z.number().min(0).nullable(),
  weight_g: z.number().min(0).nullable(),
  volume_cc: z.number().min(0).nullable(),
  dimension_unit: z.enum(['mm', 'cm', 'inch']),
  weight_unit: z.enum(['g', 'kg', 'oz', 'lb']),
})

export const productFormSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(120, 'Keep the product name under 120 characters'),
  slug: z
    .string()
    .trim()
    .min(1, 'Product slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'),
  description: z.string().max(200, 'Short description must be 200 characters or fewer'),
  long_description: z.string(),
  category_id: z.string(),
  tags: z.array(z.string()),
  occasion_tags: z.array(z.string()),
  thumbnail_url: z.string(),
  image_urls: z.array(z.string()),
  image_alt: z.record(z.string(), z.string()),
  default_dimensions: productDimensionsSchema.nullable(),
  box_dimensions: productDimensionsSchema.nullable(),
  model_url: z.string(),
  base_price: z.number().min(0, 'Price cannot be negative'),
  is_customizable: z.boolean(),
  customization_label: z.string(),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  is_archived: z.boolean(),
  meta_title: z.string().max(60, 'Meta title should be under 60 characters'),
  meta_description: z.string().max(160, 'Meta description should be under 160 characters'),
  published_at: z.string().datetime({ offset: true }).nullable(),
})

export type ProductForm = z.infer<typeof productFormSchema>

export type ProductFormErrors = Partial<Record<keyof ProductForm, string>>

export function validateField<K extends keyof ProductForm>(key: K, value: ProductForm[K]): string | undefined {
  const shape = productFormSchema.shape[key] as z.ZodType<unknown>
  const result = shape.safeParse(value)
  if (!result.success) return result.error.issues[0]?.message
  return undefined
}

export function validateProduct(product: ProductForm): ProductFormErrors {
  const result = productFormSchema.safeParse(product)
  if (result.success) return {}
  const errors: ProductFormErrors = {}
  for (const issue of result.error.issues) {
    const pathKey = issue.path[0]
    if (typeof pathKey === 'string' && !(pathKey in errors)) {
      errors[pathKey as keyof ProductForm] = issue.message
    }
  }
  return errors
}

export function getPublishBlockers(product: ProductForm): string[] {
  const blockers: string[] = []
  if (!product.name.trim()) blockers.push('Add a product name')
  if (!product.slug.trim()) blockers.push('Add a product slug')
  if (product.base_price <= 0) blockers.push('Set a base price greater than zero')
  if (!product.thumbnail_url && product.image_urls.length === 0) blockers.push('Add at least one product image')
  return blockers
}
