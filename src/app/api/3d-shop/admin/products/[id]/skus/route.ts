import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { stableStringify } from '@/lib/shop/admin-types'

type SkuPayload = {
  id?: string
  sku_code?: string
  variant_combination?: Record<string, string | boolean>
  price?: number | string
  compare_at_price?: number | string | null
  stock_quantity?: number | string
  low_stock_threshold?: number | string | null
  weight_grams?: number | string | null
  variant_image_url?: string | null
  is_available?: boolean
}

function normalizeSkuPatch(body: SkuPayload) {
  return {
    ...(Number.isFinite(Number(body.price)) ? { price: Number(body.price) } : {}),
    compare_at_price:
      body.compare_at_price === null || body.compare_at_price === undefined || body.compare_at_price === ''
        ? null
        : Number(body.compare_at_price),
    ...(Number.isFinite(Number(body.stock_quantity)) ? { stock_quantity: Number(body.stock_quantity) } : {}),
    low_stock_threshold:
      body.low_stock_threshold === null || body.low_stock_threshold === undefined
        ? 5
        : Number(body.low_stock_threshold),
    weight_grams:
      body.weight_grams === null || body.weight_grams === undefined || body.weight_grams === ''
        ? null
        : Number(body.weight_grams),
    variant_image_url:
      typeof body.variant_image_url === 'string' ? body.variant_image_url.trim() || null : body.variant_image_url ?? null,
    ...(typeof body.is_available === 'boolean' ? { is_available: body.is_available } : {}),
  }
}

async function updateProductBasePrice(productId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_skus')
    .select('price')
    .eq('product_id', productId)
    .eq('is_available', true)
    .order('price', { ascending: true })
    .limit(1)

  if (error) throw new Error(error.message)
  const minPrice = data?.[0]?.price
  if (typeof minPrice !== 'number') return

  const { error: updateError } = await supabase
    .from('shelf_products')
    .update({ base_price: minPrice })
    .eq('id', productId)

  if (updateError) throw new Error(updateError.message)
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_skus')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return NextResponse.json({ skus: data ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as { skus?: SkuPayload[] }
    const incoming = Array.isArray(body.skus) ? body.skus : []

    if (incoming.length === 0) {
      return NextResponse.json({ error: 'At least one SKU is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: existing, error: existingError } = await supabase
      .from('shelf_skus')
      .select('variant_combination')
      .eq('product_id', id)

    if (existingError) throw new Error(existingError.message)

    const existingKeys = new Set(
      (existing ?? []).map((sku) => stableStringify((sku.variant_combination ?? {}) as Record<string, unknown>))
    )

    const rows = incoming
      .filter((sku) => {
        const key = stableStringify((sku.variant_combination ?? {}) as Record<string, unknown>)
        if (existingKeys.has(key)) return false
        existingKeys.add(key)
        return true
      })
      .map((sku, index) => ({
        product_id: id,
        sku_code: sku.sku_code || `SHOP-${id.slice(0, 8).toUpperCase()}-${Date.now()}-${index + 1}`,
        variant_combination: sku.variant_combination ?? {},
        price: Number.isFinite(Number(sku.price)) ? Number(sku.price) : 0,
        compare_at_price: sku.compare_at_price ?? null,
        stock_quantity: Number.isFinite(Number(sku.stock_quantity)) ? Number(sku.stock_quantity) : 0,
        low_stock_threshold: Number.isFinite(Number(sku.low_stock_threshold)) ? Number(sku.low_stock_threshold) : 5,
        weight_grams: sku.weight_grams ?? null,
        variant_image_url: sku.variant_image_url ?? null,
        is_available: sku.is_available ?? true,
      }))

    if (rows.length > 0) {
      const { error } = await supabase.from('shelf_skus').insert(rows)
      if (error) throw new Error(error.message)
      await updateProductBasePrice(id)
    }

    const { data: skus, error: skusError } = await supabase
      .from('shelf_skus')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: true })

    if (skusError) throw new Error(skusError.message)
    return NextResponse.json({ skus: skus ?? [], inserted: rows.length, skipped: incoming.length - rows.length }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as SkuPayload
    if (!body.id) return NextResponse.json({ error: 'SKU id is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_skus')
      .update(normalizeSkuPatch(body))
      .eq('product_id', id)
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    await updateProductBasePrice(id)
    return NextResponse.json({ sku: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const skuId = searchParams.get('id')
    if (!skuId) return NextResponse.json({ error: 'SKU id is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from('shelf_skus').delete().eq('product_id', id).eq('id', skuId)
    if (error) throw new Error(error.message)
    await updateProductBasePrice(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
