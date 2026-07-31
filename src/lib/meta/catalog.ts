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

export async function upsertMetaCatalogItem(product: ProductInput): Promise<ProductSyncAction[]> {
  const catalogId = getMetaCatalogId()
  const headers = getMetaApiHeaders()
  const actions: ProductSyncAction[] = []

  if (!product.skus?.length) {
    const entry: MetaBatchRequestEntry = {
      method: 'UPDATE',
      retailer_id: product.slug,
      data: buildCatalogItem(product, {
        id: product.id,
        sku_code: product.slug,
        price: product.base_price,
        stock_quantity: 0,
        is_available: product.is_active,
        variant_combination: {},
        variant_image_url: null,
      }),
    }

    try {
      const response = await fetch(`${getMetaGraphBase()}/${catalogId}/items_batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ allow_upsert: true, item_type: 'PRODUCT_ITEM', requests: [entry] }),
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        actions.push({
          productId: product.id,
          skuCode: product.slug,
          action: 'upsert',
          success: false,
          error: `Meta API error ${response.status}: ${errBody}`,
        })
        return actions
      }

      const result = await response.json() as { handles?: string[]; validation_status?: { handles: Array<{ handle: string; errors?: Array<{ message: string }> }> } }
      const handle = result.handles?.[0]
      const error = result.validation_status?.handles?.[0]?.errors?.[0]?.message

      actions.push({
        productId: product.id,
        skuCode: product.slug,
        action: 'upsert',
        success: !error,
        error,
        metaHandle: handle,
      })
    } catch (err) {
      actions.push({
        productId: product.id,
        skuCode: product.slug,
        action: 'upsert',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    return actions
  }

  const entries: MetaBatchRequestEntry[] = product.skus.map((sku) => ({
    method: 'UPDATE',
    retailer_id: sku.sku_code,
    data: buildCatalogItem(product, sku),
  }))

  try {
    const response = await fetch(`${getMetaGraphBase()}/${catalogId}/items_batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ allow_upsert: true, item_type: 'PRODUCT_ITEM', requests: entries }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      product.skus.forEach((sku) => {
        actions.push({
          productId: product.id,
          skuCode: sku.sku_code,
          action: 'upsert',
          success: false,
          error: `Meta API error ${response.status}: ${errBody}`,
        })
      })
      return actions
    }

    const result = await response.json() as { handles?: string[]; validation_status?: { handles: Array<{ handle: string; errors?: Array<{ message: string }> }> } }
    const validationHandles = result.validation_status?.handles ?? []

    product.skus.forEach((sku, index) => {
      const handle = result.handles?.[index]
      const error = validationHandles[index]?.errors?.[0]?.message as string | undefined
      actions.push({
        productId: product.id,
        skuCode: sku.sku_code,
        action: 'upsert',
        success: !error,
        error,
        metaHandle: handle,
      })
    })
  } catch (err) {
    product.skus.forEach((sku) => {
      actions.push({
        productId: product.id,
        skuCode: sku.sku_code,
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

export async function syncFullCatalogToMeta(products: ProductInput[]): Promise<ProductSyncResult> {
  const startedAt = Date.now()
  const allActions: ProductSyncAction[] = []

  for (const product of products) {
    const actions = await upsertMetaCatalogItem(product)
    allActions.push(...actions)
  }

  return {
    total: allActions.length,
    succeeded: allActions.filter((a) => a.success).length,
    failed: allActions.filter((a) => !a.success).length,
    actions: allActions,
    durationMs: Date.now() - startedAt,
  }
}
