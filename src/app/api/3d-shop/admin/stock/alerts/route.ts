import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import type { StockAlertRow } from '@/lib/shop/stock'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const STATUSES = ['open', 'acknowledged', 'resolved']

type RawAlert = {
  id: string
  sku_id: string
  product_id: string
  alert_type: StockAlertRow['alert_type']
  severity: StockAlertRow['severity']
  message: string
  status: StockAlertRow['status']
  stock_at_alert: number
  notified_at: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
  sku: { sku_code: string; variant_combination: Record<string, string | boolean> } | null
  product: { name: string | null; thumbnail_url: string | null } | null
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('stock_alerts')
      .select(`
        id,
        sku_id,
        product_id,
        alert_type,
        severity,
        message,
        status,
        stock_at_alert,
        notified_at,
        acknowledged_at,
        resolved_at,
        created_at,
        sku:shelf_skus(sku_code, variant_combination),
        product:shelf_products(name, thumbnail_url)
      `, { count: 'exact' })

    if (status && STATUSES.includes(status)) query = query.eq('status', status)
    if (type === 'low_stock' || type === 'out_of_stock') query = query.eq('alert_type', type)

    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (error) throw new Error(error.message)

    const raw = (data ?? []) as unknown as RawAlert[]

    const alerts: StockAlertRow[] = raw.map((alert) => ({
      id: alert.id,
      sku_id: alert.sku_id,
      product_id: alert.product_id,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      status: alert.status,
      stock_at_alert: alert.stock_at_alert,
      notified_at: alert.notified_at,
      acknowledged_at: alert.acknowledged_at,
      resolved_at: alert.resolved_at,
      created_at: alert.created_at,
      sku_code: alert.sku?.sku_code ?? null,
      variant_combination: alert.sku?.variant_combination ?? {},
      product_name: alert.product?.name ?? null,
      product_thumbnail: alert.product?.thumbnail_url ?? null,
    }))

    return NextResponse.json({
      alerts,
      total: count ?? alerts.length,
      page,
      pageSize: PAGE_SIZE,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
