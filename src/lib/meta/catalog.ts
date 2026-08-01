import { createHash } from 'node:crypto'
import { getMetaApiHeaders, getMetaCatalogId, getMetaGraphBase } from './config'
import type { MetaBatchRequestEntry, MetaCatalogItemData, ProductSyncAction, ProductSyncResult } from './types'

type ProductSkuInput = {
  id: string
  sku_code: string
  price: number
  stock_quantity: number
  is_available: boolean | null
  variant_combination: Record<string, string | boolean>
  variant_image_url: string | null
}

type ProductInput = {
  id: string
  name: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  image_urls: string[] | null
  is_active: boolean | null
  is_archived: boolean | null
  base_price: number
  category_name?: string | null
  skus?: ProductSkuInput[] | null
}

function buildCatalogItem(product: ProductInput, sku: ProductSkuInput): MetaCatalogItemData {
  const variantParts = Object.entries(sku.variant_combination ?? {}).map(([k, v]) => `${k}:${v}`)
  const variantLabel = variantParts.join(', ')
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in').replace(/\/+$/, '')
  const productUrl = `${baseUrl}/3d-shop/product/${product.slug}${sku.sku_code ? `?sku=${sku.sku_code}` : ''}`
  const image = sku.variant_image_url || product.thumbnail_url || product.image_urls?.[0] || undefined

  const availability: MetaCatalogItemData['availability'] =
    !product.is_active || product.is_archived
      ? 'out of stock'
      : sku.stock_quantity > 0
        ? 'in stock'
        : sku.is_available
          ? 'preorder'
          : 'out of stock'

  const item: MetaCatalogItemData = {
    id: sku.sku_code,
    title: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
    description: product.description?.slice(0, 9999) || undefined,
    availability,
    condition: 'new',
    price: `${(sku.price || product.base_price).toFixed(2)} INR`,
    link: productUrl,
    image_link: image,
    item_group_id: product.slug,
    visibility: product.is_active && !product.is_archived ? 'published' : 'staging',
    brand: 'Flux3D',
    google_product_category: 'Electronics > 3D Printing',
  }

  if (product.thumbnail_url && image !== product.thumbnail_url) {
    item.additional_image_link = [product.thumbnail_url]
  }

  if (product.category_name) {
    item.custom_label_0 = product.category_name
  }

  if (sku.stock_quantity >= 0) {
    item.inventory = sku.stock_quantity
  }

  const color = sku.variant_combination?.color ?? sku.variant_combination?.Color
  if (color) {
    item.color = String(color)
    item.custom_label_1 = `Color:${color}`
  }

  const material = sku.variant_combination?.material ?? sku.variant_combination?.Material
  if (material) {
    item.material = String(material)
    item.custom_label_2 = `Material:${material}`
  }

  const size = sku.variant_combination?.size ?? sku.variant_combination?.Size
  if (size) {
    item.size = String(size)
    item.custom_label_3 = `Size:${size}`
  }

  item.custom_label_4 = `SKU:${sku.sku_code}`

  return item
}

// Stable hash of the exact payload we send to Meta. Two SKUs are identical for
// WhatsApp review purposes if (and only if) this hash matches, so the cron can
// skip re-pushing unchanged items and avoid re-triggering review churn.
export function computeCatalogItemHash(item: MetaCatalogItemData): string {
  const cleaned = Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined),
  )
  return createHash('sha256').update(JSON.stringify(cleaned)).digest('hex')
}

export type CatalogEntry = {
  retailerId: string
  data: MetaCatalogItemData
  hash: string
}

export function buildCatalogEntries(product: ProductInput): CatalogEntry[] {
  if (!product.skus?.length) {
    const data = buildCatalogItem(product, {
      id: product.id,
      sku_code: product.slug,
      price: product.base_price,
      stock_quantity: 0,
      is_available: product.is_active,
      variant_combination: {},
      variant_image_url: null,
    })
    return [{ retailerId: product.slug, data, hash: computeCatalogItemHash(data) }]
  }

  return product.skus.map((sku) => {
    const data = buildCatalogItem(product, sku)
    return { retailerId: sku.sku_code, data, hash: computeCatalogItemHash(data) }
  })
}

export async function upsertMetaCatalogItem(product: ProductInput): Promise<ProductSyncAction[]> {
  const catalogId = getMetaCatalogId()
  const headers = getMetaApiHeaders()
  const actions: ProductSyncAction[] = []
  const entries = buildCatalogEntries(product).map((entry) => ({
    method: 'UPDATE' as const,
    retailer_id: entry.retailerId,
    data: entry.data,
  }))

  try {
    const response = await fetch(`${getMetaGraphBase()}/${catalogId}/items_batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ allow_upsert: true, item_type: 'PRODUCT_ITEM', requests: entries }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      entries.forEach((entry) => {
        actions.push({
          productId: product.id,
          skuCode: entry.retailer_id,
          action: 'upsert',
          success: false,
          error: `Meta API error ${response.status}: ${errBody}`,
        })
      })
      return actions
    }

    const result = await response.json() as { handles?: string[]; validation_status?: { handles: Array<{ handle: string; errors?: Array<{ message: string }> }> } }
    const validationHandles = result.validation_status?.handles ?? []

    entries.forEach((entry, index) => {
      const handle = result.handles?.[index]
      const error = validationHandles[index]?.errors?.[0]?.message as string | undefined
      actions.push({
        productId: product.id,
        skuCode: entry.retailer_id,
        action: 'upsert',
        success: !error,
        error,
        metaHandle: handle,
      })
    })
  } catch (err) {
    entries.forEach((entry) => {
      actions.push({
        productId: product.id,
        skuCode: entry.retailer_id,
        action: 'upsert',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }

  return actions
}

export async function deleteMetaCatalogItem(retailerId: string): Promise<ProductSyncAction> {
  const catalogId = getMetaCatalogId()
  const headers = getMetaApiHeaders()

  const entry: MetaBatchRequestEntry = {
    method: 'DELETE',
    retailer_id: retailerId,
    data: { id: retailerId },
  }

  try {
    const response = await fetch(`${getMetaGraphBase()}/${catalogId}/items_batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ item_type: 'PRODUCT_ITEM', requests: [entry] }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      return {
        productId: retailerId,
        skuCode: retailerId,
        action: 'delete',
        success: false,
        error: `Meta API error ${response.status}: ${errBody}`,
      }
    }

    const result = await response.json() as { handles?: string[]; validation_status?: { handles: Array<{ handle: string; errors?: Array<{ message: string }> }> } }
    const error = result.validation_status?.handles?.[0]?.errors?.[0]?.message

    return {
      productId: retailerId,
      skuCode: retailerId,
      action: 'delete',
      success: !error,
      error,
      metaHandle: result.handles?.[0],
    }
  } catch (err) {
    return {
      productId: retailerId,
      skuCode: retailerId,
      action: 'delete',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export type StoredCatalogHashes = Record<string, string>

export type SyncFullCatalogResult = ProductSyncResult & {
  skipped: number
  hashes: StoredCatalogHashes
}

/**
 * Change-aware full catalog sync.
 *
 * Pass the previously stored per-SKU payload hashes (keyed by sku_code/slug).
 * Any item whose computed hash matches the stored one is left untouched so the
 * periodic cron does NOT re-trigger WhatsApp review on unchanged items (which
 * was flipping APPROVED items to OUTDATED/NO_REVIEW and hiding the catalog).
 *
 * Returns the map of sku_code -> current hash that the caller should persist.
 */
export async function syncFullCatalogToMeta(
  products: ProductInput[],
  storedHashes: StoredCatalogHashes = {},
): Promise<SyncFullCatalogResult> {
  const startedAt = Date.now()
  const allActions: ProductSyncAction[] = []
  const hashes: StoredCatalogHashes = {}
  let skipped = 0

  for (const product of products) {
    const entries = buildCatalogEntries(product)
    const changed: CatalogEntry[] = []
    for (const entry of entries) {
      if (storedHashes[entry.retailerId] === entry.hash) {
        skipped += 1
      } else {
        changed.push(entry)
      }
      hashes[entry.retailerId] = entry.hash
    }

    if (changed.length === 0) continue

    const actions = await upsertMetaCatalogItem(product)
    allActions.push(...actions)
  }

  return {
    total: allActions.length,
    succeeded: allActions.filter((a) => a.success).length,
    failed: allActions.filter((a) => !a.success).length,
    actions: allActions,
    durationMs: Date.now() - startedAt,
    skipped,
    hashes,
  }
}
