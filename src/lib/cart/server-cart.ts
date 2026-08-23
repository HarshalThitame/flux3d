'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type CartType = 'shop' | 'quote'

const ACTIVE_STATUS = 'active'

export type ServerCartLine = {
  id: string
  user_id: string
  cart_type: CartType
  sku_id: string | null
  product_id: string | null
  quantity: number
  material: string | null
  weight_grams: number | null
  estimated_cost: number | null
  express_delivery: boolean
  gift_packaging: boolean
  status: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type NewServerCartLine = {
  user_id: string
  cart_type: CartType
  sku_id?: string | null
  product_id?: string | null
  quantity: number
  material?: string | null
  weight_grams?: number | null
  estimated_cost?: number | null
  express_delivery?: boolean
  gift_packaging?: boolean
  payload?: Record<string, unknown>
}

export type ServerCartLinePatch = {
  quantity?: number
  payload?: Record<string, unknown>
  estimated_cost?: number | null
  weight_grams?: number | null
}

export type LiveSkuSnapshot = {
  skuId: string
  productId: string
  skuCode: string
  variantCombination: Record<string, string | boolean>
  price: number
  compareAtPrice: number | null
  stockQuantity: number
  isAvailable: boolean
  weightGrams: number
  variantImageUrl: string | null
  productName: string
  productSlug: string
  thumbnailUrl: string | null
}

export async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export async function loadServerCart(userId: string, cartType: CartType): Promise<ServerCartLine[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .eq('cart_type', cartType)
    .eq('status', ACTIVE_STATUS)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ServerCartLine[]
}

export async function insertServerCartLine(line: NewServerCartLine): Promise<ServerCartLine> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('cart_items')
    .insert(line)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as ServerCartLine
}

export async function updateServerCartLine(id: string, patch: ServerCartLinePatch): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('cart_items')
    .update(patch)
    .eq('id', id)
    .eq('status', ACTIVE_STATUS)

  if (error) throw new Error(error.message)
}

export async function deleteServerCartLine(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', id)
    .eq('status', ACTIVE_STATUS)

  if (error) throw new Error(error.message)
}

export async function clearServerCart(cartType: CartType): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_type', cartType)
    .eq('status', ACTIVE_STATUS)

  if (error) throw new Error(error.message)
}

type LiveSkuRow = {
  id: string
  sku_code: string | null
  variant_combination: Record<string, string | boolean> | null
  price: number | string | null
  compare_at_price: number | string | null
  stock_quantity: number | null
  is_available: boolean | null
  weight_grams: number | string | null
  variant_image_url: string | null
  product: {
    id: string
    name: string | null
    slug: string | null
    thumbnail_url: string | null
  } | null
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function fetchLiveShopSkus(skuIds: string[]): Promise<Map<string, LiveSkuSnapshot>> {
  const result = new Map<string, LiveSkuSnapshot>()
  if (skuIds.length === 0) return result

  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('shelf_skus')
    .select(`id,
      sku_code,
      variant_combination,
      price,
      compare_at_price,
      stock_quantity,
      is_available,
      weight_grams,
      variant_image_url,
      product:shelf_products(id, name, slug, thumbnail_url)`)
    .in('id', skuIds)

  if (error) throw new Error(error.message)

  for (const row of (data ?? []) as unknown as LiveSkuRow[]) {
    result.set(row.id, {
      skuId: row.id,
      productId: row.product?.id ?? '',
      skuCode: row.sku_code ?? '',
      variantCombination: row.variant_combination ?? {},
      price: toNumber(row.price),
      compareAtPrice: row.compare_at_price == null ? null : toNumber(row.compare_at_price),
      stockQuantity: Math.max(0, Math.floor(toNumber(row.stock_quantity))),
      isAvailable: row.is_available !== false,
      weightGrams: Math.max(0, Math.floor(toNumber(row.weight_grams))),
      variantImageUrl: row.variant_image_url,
      productName: row.product?.name ?? '',
      productSlug: row.product?.slug ?? '',
      thumbnailUrl: row.product?.thumbnail_url ?? null,
    })
  }

  return result
}
