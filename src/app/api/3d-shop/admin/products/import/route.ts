import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { invalidateShopDataCache } from '@/lib/shop/public-data'
import {
  csvToRecords,
  parseCsv,
  uniqueSlug,
  type ImportProductRecord,
  type ImportRowError,
  type ImportSku,
  type ImportVariant,
} from '@/lib/shop/import-export'

const VALID_OPTION_TYPES = ['swatch_color', 'button', 'dropdown', 'toggle', 'text_input']
const MAX_RECORDS = 300

type ImportOutcome = { imported: number; skipped: number; errors: ImportRowError[] }

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as { format?: string; data?: string }
    const format = body.format === 'csv' ? 'csv' : 'json'
    if (typeof body.data !== 'string' || !body.data.trim()) {
      return NextResponse.json({ error: 'No import data provided.' }, { status: 400 })
    }

    let records: ImportProductRecord[]
    let errors: ImportRowError[]
    if (format === 'csv') {
      const parsed = parseCsv(body.data)
      const result = csvToRecords(parsed)
      records = result.records
      errors = result.errors
    } else {
      let parsed: unknown
      try {
        parsed = JSON.parse(body.data)
      } catch {
        return NextResponse.json({ error: 'Invalid JSON file.' }, { status: 400 })
      }
      const list = Array.isArray(parsed) ? parsed : (parsed as { products?: unknown[] }).products
      if (!Array.isArray(list)) {
        return NextResponse.json({ error: 'JSON must be an array of products or an object with a products array.' }, { status: 400 })
      }
      records = list
        .map((item) => item as ImportProductRecord)
        .filter((item): item is ImportProductRecord => Boolean(item && typeof item === 'object' && 'name' in item))
      errors = list
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item || typeof item !== 'object' || !('name' in item))
        .map(({ index }) => ({ row: index + 1, error: 'Missing name or invalid row' }))
    }

    if (records.length > MAX_RECORDS) {
      return NextResponse.json({ error: `Too many products. Maximum is ${MAX_RECORDS} per import.` }, { status: 400 })
    }

    const outcome = await importProducts(records, errors)
    if (outcome.imported > 0) invalidateShopDataCache()
    return NextResponse.json({ ...outcome, format }, { status: outcome.imported > 0 ? 201 : 200 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

async function importProducts(records: ImportProductRecord[], initialErrors: ImportRowError[]): Promise<ImportOutcome> {
  const supabase = createAdminSupabaseClient()
  const errors: ImportRowError[] = [...initialErrors]

  const existingResult = await supabase.from('shelf_products').select('slug')
  const categoriesResult = await supabase.from('shelf_categories').select('id, name, slug')
  if (existingResult.error) throw new Error(existingResult.error.message)
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)

  const takenSlugs = new Set((existingResult.data ?? []).map((row) => row.slug))
  const categoryByName = new Map<string, string>()
  const categoryBySlug = new Map<string, string>()
  for (const category of (categoriesResult.data ?? []) as Array<{ id: string; name: string; slug: string }>) {
    categoryByName.set(category.name.trim().toLowerCase(), category.id)
    categoryBySlug.set(category.slug.toLowerCase(), category.id)
  }

  let imported = 0
  let skipped = 0

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    const rowNumber = index + 1
    try {
      const slug = uniqueSlug(record.slug || record.name, takenSlugs)
      const categoryId = record.category
        ? categoryByName.get(record.category.trim().toLowerCase()) ?? categoryBySlug.get(record.category.trim().toLowerCase())
        : undefined

      const { data: product, error: productError } = await supabase
        .from('shelf_products')
        .insert({
          name: record.name.trim(),
          slug,
          description: record.description ?? null,
          long_description: record.long_description ?? null,
          category_id: categoryId ?? null,
          tags: Array.isArray(record.tags) ? record.tags : [],
          occasion_tags: Array.isArray(record.occasion_tags) ? record.occasion_tags : [],
          thumbnail_url: record.thumbnail_url ?? null,
          image_urls: Array.isArray(record.image_urls) ? record.image_urls : [],
          image_alt: record.image_alt && typeof record.image_alt === 'object' ? record.image_alt : {},
          model_url: record.model_url ?? null,
          base_price: Number.isFinite(Number(record.base_price)) ? Number(record.base_price) : 0,
          is_customizable: record.is_customizable ?? false,
          customization_label: record.customization_label ?? null,
          is_featured: record.is_featured ?? false,
          is_active: record.is_active ?? false,
          meta_title: record.meta_title ?? null,
          meta_description: record.meta_description ?? null,
          published_at: record.published_at ? new Date(record.published_at).toISOString() : null,
        })
        .select('id')
        .single()

      if (productError || !product) throw new Error(productError?.message ?? 'Failed to insert product.')
      imported += 1

      const variants = (record.variants ?? [])
        .filter((variant): variant is ImportVariant => Boolean(variant && typeof variant.option_name === 'string'))
        .filter((variant) => VALID_OPTION_TYPES.includes(variant.option_type))
        .map((variant, order) => ({
          product_id: product.id,
          option_name: variant.option_name.trim(),
          option_type: variant.option_type,
          values: Array.isArray(variant.values) ? variant.values.map(String) : [],
          display_order: Number.isFinite(Number(variant.display_order)) ? Number(variant.display_order) : order,
          is_required: variant.is_required ?? true,
        }))
      if (variants.length > 0) {
        const { error: variantError } = await supabase.from('shelf_variant_options').insert(variants)
        if (variantError) throw new Error(variantError.message)
      }

      const skus = (record.skus ?? [])
        .filter((sku): sku is ImportSku => Boolean(sku && sku.variant_combination && typeof sku.variant_combination === 'object'))
        .map((sku, order) => ({
          product_id: product.id,
          sku_code:
            sku.sku_code?.trim() ||
            `${slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${Date.now().toString(36).toUpperCase()}-${order + 1}`,
          variant_combination: sku.variant_combination,
          price: Number.isFinite(Number(sku.price)) ? Number(sku.price) : 0,
          compare_at_price: sku.compare_at_price ?? null,
          stock_quantity: Number.isFinite(Number(sku.stock_quantity)) ? Number(sku.stock_quantity) : 0,
          low_stock_threshold: Number.isFinite(Number(sku.low_stock_threshold)) ? Number(sku.low_stock_threshold) : 5,
          weight_grams: sku.weight_grams ?? null,
          variant_image_url: sku.variant_image_url ?? null,
          is_available: sku.is_available ?? true,
        }))
      if (skus.length > 0) {
        const { error: skuError } = await supabase.from('shelf_skus').insert(skus)
        if (skuError) throw new Error(skuError.message)
      }
    } catch (error) {
      skipped += 1
      errors.push({ row: rowNumber, error: error instanceof Error ? error.message : 'Import failed for this row.' })
    }
  }

  return { imported, skipped, errors }
}
