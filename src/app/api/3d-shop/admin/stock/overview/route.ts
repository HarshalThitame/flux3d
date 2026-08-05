import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSkuStockStatus, getThreshold, type StockOverview } from '@/lib/shop/stock'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    const skuQuery = supabase.from('shelf_skus').select(`
      id,
      product_id,
      sku_code,
      price,
      stock_quantity,
      reserved_quantity,
      low_stock_threshold,
      reorder_point,
      is_available,
      product:shelf_products(name, is_archived)
    `)

    const { data: skus, error: skuError } = await skuQuery
    if (skuError) throw new Error(skuError.message)

    const rows = (skus ?? []) as unknown as Array<{
      id: string
      product_id: string
      sku_code: string
      price: number
      stock_quantity: number
      reserved_quantity: number
      low_stock_threshold: number | null
      reorder_point: number | null
      is_available: boolean | null
      product: { name: string | null; is_archived: boolean | null } | null
    }>

    const activeSkus = rows.filter(
      (sku) => sku.is_available !== false && sku.product?.is_archived !== true
    )
    const products = new Set(activeSkus.map((sku) => sku.product_id)).size

    let lowStockCount = 0
    let outOfStockCount = 0
    let unavailableCount = 0
    let unitsOnHand = 0
    let unitsReserved = 0
    let stockValue = 0

    for (const sku of activeSkus) {
      const threshold = getThreshold(sku)
      const status = getSkuStockStatus(sku.stock_quantity, threshold, sku.is_available)
      if (status === 'low_stock') lowStockCount += 1
      if (status === 'out_of_stock') outOfStockCount += 1
      if (status === 'unavailable') unavailableCount += 1
      unitsOnHand += sku.stock_quantity
      unitsReserved += sku.reserved_quantity
      stockValue += Number(sku.price ?? 0) * sku.stock_quantity
    }

    const { count: activeReservations } = await supabase
      .from('inventory_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const soonThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { count: expiringSoon } = await supabase
      .from('inventory_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('expires_at', soonThreshold)

    const { data: alerts, error: alertsError } = await supabase
      .from('stock_alerts')
      .select('status, product_id')
      .in('status', ['open', 'acknowledged'])

    if (alertsError) throw new Error(alertsError.message)

    const openAlerts = (alerts ?? []).filter((alert) => alert.status === 'open').length
    const alertProducts = new Set((alerts ?? []).map((alert) => alert.product_id)).size

    const overview: StockOverview = {
      totalSkus: activeSkus.length,
      totalProducts: products,
      unitsOnHand,
      unitsReserved,
      stockValue,
      lowStockCount,
      outOfStockCount,
      unavailableCount,
      activeReservations: activeReservations ?? 0,
      expiringSoonReservations: expiringSoon ?? 0,
      openAlerts,
      alertProducts,
    }

    return NextResponse.json({ overview })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
