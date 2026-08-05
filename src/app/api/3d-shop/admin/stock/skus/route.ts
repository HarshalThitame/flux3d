import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSkuStockStatus, getThreshold, type StockSkuRow } from '@/lib/shop/stock'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

type RawSku = {
  id: string
  product_id: string
  sku_code: string
  variant_combination: Record<string, string | boolean>
  price: number
  compare_at_price: number | null
  stock_quantity: number
  reserved_quantity: number
  low_stock_threshold: number | null
  reorder_point: number | null
  weight_grams: number | null
  variant_image_url: string | null
  is_available: boolean | null
  pre_order_eta: string | null
  product: {
    name: string | null
    thumbnail_url: string | null
    is_archived: boolean | null
    category: { name: string | null } | null
  } | null
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const status = searchParams.get('status') // in_stock | low_stock | out_of_stock | unavailable | all
    const availability = searchParams.get('availability') // available | unavailable | all
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort') ?? 'updated_at'
    const sortDir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('page_size') ?? PAGE_SIZE)))

    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('shelf_skus')
      .select(`
        id,
        product_id,
        sku_code,
        variant_combination,
        price,
        compare_at_price,
        stock_quantity,
        reserved_quantity,
        low_stock_threshold,
        reorder_point,
        weight_grams,
        variant_image_url,
        is_available,
        pre_order_eta,
        created_at,
        updated_at,
        product:shelf_products(name, thumbnail_url, is_archived, category:shelf_categories(name))
      `, { count: 'exact' })
      .eq('product.is_archived', false)

    if (categoryId) query = query.eq('product.category_id', categoryId)
    if (availability === 'available') query = query.eq('is_available', true)
    if (availability === 'unavailable') query = query.eq('is_available', false)
    if (search) {
      query = query.or(`sku_code.ilike.%${search}%,product.name.ilike.%${search}%`)
    }

    // Sorting
    const allowedSorts = ['updated_at', 'created_at', 'price', 'sku_code']
    const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'updated_at'
    query = query.order(sortColumn, { ascending: sortDir === 'asc' })

    // Stock-status filtering depends on per-row thresholds (reorder_point /
    // low_stock_threshold) that PostgREST cannot express in a range query, so
    // when a status filter is active we load the full filtered set (bounded by
    // a safety cap) and paginate in memory so totals stay exact. Without a
    // status filter we use DB-level pagination with an exact count.
    const hasStatusFilter = Boolean(status && status !== 'all')
    let raw: RawSku[] = []
    let dbTotal = 0
    if (hasStatusFilter) {
      const { data: allData, error: allError } = await query.range(0, 10000)
      if (allError) throw new Error(allError.message)
      raw = (allData ?? []) as unknown as RawSku[]
    } else {
      const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1)
      if (error) throw new Error(error.message)
      raw = (data ?? []) as unknown as RawSku[]
      dbTotal = count ?? 0
    }

    // Post-filter for stock status (computed client-side threshold) and
    // convert raw rows to the workspace shape.
    const allRows: StockSkuRow[] = raw.map((sku) => {
      const threshold = getThreshold(sku)
      const stockStatus = getSkuStockStatus(sku.stock_quantity, threshold, sku.is_available)
      return {
        id: sku.id,
        product_id: sku.product_id,
        sku_code: sku.sku_code,
        variant_combination: sku.variant_combination ?? {},
        price: Number(sku.price ?? 0),
        compare_at_price: sku.compare_at_price,
        stock_quantity: sku.stock_quantity,
        reserved_quantity: sku.reserved_quantity,
        low_stock_threshold: sku.low_stock_threshold,
        reorder_point: sku.reorder_point,
        weight_grams: sku.weight_grams,
        variant_image_url: sku.variant_image_url,
        is_available: sku.is_available,
        pre_order_eta: sku.pre_order_eta,
        product_name: sku.product?.name ?? null,
        category_name: sku.product?.category?.name ?? null,
        product_thumbnail: sku.product?.thumbnail_url ?? null,
        is_archived: sku.product?.is_archived ?? false,
        stock_status: stockStatus,
        available_quantity: sku.stock_quantity - sku.reserved_quantity,
      }
    })

    let rows = allRows
    if (status && status !== 'all') {
      rows = allRows.filter((row) => row.stock_status === status)
    }

    const pageRows = hasStatusFilter
      ? rows.slice((page - 1) * pageSize, page * pageSize)
      : rows

    return NextResponse.json({
      skus: pageRows,
      total: hasStatusFilter ? rows.length : dbTotal,
      page,
      pageSize,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
