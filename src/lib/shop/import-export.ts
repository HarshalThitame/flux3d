import { slugifyShopValue } from '@/lib/shop/admin-types'

export type ImportVariant = {
  option_name: string
  option_type: string
  values: string[]
  is_required: boolean
  display_order?: number
}

export type ImportSku = {
  sku_code?: string
  variant_combination: Record<string, string | boolean>
  price: number
  compare_at_price?: number | null
  stock_quantity?: number
  low_stock_threshold?: number | null
  weight_grams?: number | null
  variant_image_url?: string | null
  is_available?: boolean
}

export type ImportProductRecord = {
  name: string
  slug?: string
  description?: string | null
  long_description?: string | null
  category?: string | null
  tags?: string[]
  occasion_tags?: string[]
  thumbnail_url?: string | null
  image_urls?: string[]
  image_alt?: Record<string, string>
  model_url?: string | null
  base_price?: number
  is_customizable?: boolean
  customization_label?: string | null
  is_featured?: boolean
  is_active?: boolean
  meta_title?: string | null
  meta_description?: string | null
  published_at?: string | null
  variants?: ImportVariant[]
  skus?: ImportSku[]
}

export type ImportRowError = { row: number; error: string }

const ARRAY_SEPARATOR = '|'

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

function splitArray(value: string): string[] {
  return value
    .split(ARRAY_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBool(value: string): boolean | undefined {
  if (!value) return undefined
  return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1'
}

function parseJsonCell<T>(value: string): T | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

export function csvRowToRecord(cells: string[], headers: string[]): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((header, index) => {
    if (header) record[header] = (cells[index] ?? '').trim()
  })
  return record
}

export function mapCsvRecord(record: Record<string, string>): ImportProductRecord {
  const name = record.name
  if (!name) throw new Error('Missing name')
  const numeric = (value: string): number | undefined => {
    const parsed = Number(value)
    return value !== '' && Number.isFinite(parsed) ? parsed : undefined
  }
  return {
    name,
    slug: record.slug || undefined,
    description: record.description || null,
    long_description: record.long_description || null,
    category: record.category || null,
    tags: record.tags ? splitArray(record.tags) : [],
    occasion_tags: record.occasion_tags ? splitArray(record.occasion_tags) : [],
    thumbnail_url: record.thumbnail_url || null,
    image_urls: record.image_urls ? splitArray(record.image_urls) : [],
    image_alt: record.image_alt ? parseJsonCell<Record<string, string>>(record.image_alt) : undefined,
    model_url: record.model_url || null,
    base_price: numeric(record.base_price),
    is_customizable: parseBool(record.is_customizable),
    customization_label: record.customization_label || null,
    is_featured: parseBool(record.is_featured),
    is_active: parseBool(record.is_active),
    meta_title: record.meta_title || null,
    meta_description: record.meta_description || null,
    published_at: record.published_at || null,
    variants: record.variants ? parseJsonCell<ImportVariant[]>(record.variants) : undefined,
    skus: record.skus ? parseJsonCell<ImportSku[]>(record.skus) : undefined,
  }
}

export function csvToRecords(rows: string[][]): { records: ImportProductRecord[]; errors: ImportRowError[] } {
  if (rows.length === 0) return { records: [], errors: [] }
  const headers = rows[0].map((header) => header.trim())
  const records: ImportProductRecord[] = []
  const errors: ImportRowError[] = []
  for (let index = 1; index < rows.length; index += 1) {
    const cells = rows[index]
    const record = csvRowToRecord(cells, headers)
    if (!record.name) {
      errors.push({ row: index + 1, error: 'Missing name' })
      continue
    }
    try {
      records.push(mapCsvRecord(record))
    } catch (error) {
      errors.push({ row: index + 1, error: error instanceof Error ? error.message : 'Invalid row' })
    }
  }
  return { records, errors }
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  const clean = slugifyShopValue(base) || `product-${Date.now().toString(36)}`
  if (!taken.has(clean)) return clean
  let suffix = 2
  while (taken.has(`${clean}-${suffix}`)) suffix += 1
  const result = `${clean}-${suffix}`
  taken.add(result)
  return result
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export const CSV_COLUMNS = [
  'name',
  'slug',
  'description',
  'long_description',
  'category',
  'tags',
  'occasion_tags',
  'thumbnail_url',
  'image_urls',
  'image_alt',
  'model_url',
  'base_price',
  'is_customizable',
  'customization_label',
  'is_featured',
  'is_active',
  'meta_title',
  'meta_description',
  'published_at',
  'variants',
  'skus',
]

export function productsToCsv(
  products: {
    name: string
    slug: string
    description: string | null
    long_description: string | null
    category_name: string | null
    tags: string[] | null
    occasion_tags: string[] | null
    thumbnail_url: string | null
    image_urls: string[] | null
    image_alt: Record<string, string> | null
    model_url: string | null
    base_price: number
    is_customizable: boolean | null
    customization_label: string | null
    is_featured: boolean | null
    is_active: boolean | null
    meta_title: string | null
    meta_description: string | null
    published_at: string | null
    variants?: unknown[]
    skus?: unknown[]
  }[]
): string {
  const header = CSV_COLUMNS.join(',')
  const lines = [header]
  for (const product of products) {
    const join = (value: string[] | null | undefined) => (value && value.length > 0 ? value.join(ARRAY_SEPARATOR) : '')
    const values: Record<string, string> = {
      name: product.name,
      slug: product.slug,
      description: product.description ?? '',
      long_description: product.long_description ?? '',
      category: product.category_name ?? '',
      tags: join(product.tags),
      occasion_tags: join(product.occasion_tags),
      thumbnail_url: product.thumbnail_url ?? '',
      image_urls: join(product.image_urls),
      image_alt: product.image_alt && Object.keys(product.image_alt).length > 0 ? JSON.stringify(product.image_alt) : '',
      model_url: product.model_url ?? '',
      base_price: String(Number(product.base_price ?? 0)),
      is_customizable: product.is_customizable ? 'true' : 'false',
      customization_label: product.customization_label ?? '',
      is_featured: product.is_featured ? 'true' : 'false',
      is_active: product.is_active ? 'true' : 'false',
      meta_title: product.meta_title ?? '',
      meta_description: product.meta_description ?? '',
      published_at: product.published_at ?? '',
      variants: product.variants && product.variants.length > 0 ? JSON.stringify(product.variants) : '',
      skus: product.skus && product.skus.length > 0 ? JSON.stringify(product.skus) : '',
    }
    lines.push(CSV_COLUMNS.map((column) => escapeCsvCell(values[column] ?? '')).join(','))
  }
  return lines.join('\n')
}
