import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import type { StockReservationRow } from '@/lib/shop/stock'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const STATUSES = ['active', 'converted', 'expired', 'cancelled']

type RawReservation = {
  id: string
  sku_id: string
  order_id: string
  quantity: number
  status: StockReservationRow['status']
  reserved_at: string
  expires_at: string
  converted_at: string | null
  cancelled_at: string | null
  sku: {
    sku_code: string
    variant_combination: Record<string, string | boolean>
    product: { id: string; name: string | null; thumbnail_url: string | null } | null
  } | null
  order: {
    order_number: string | null
    total_amount: number | null
    payment_status: string | null
  } | null
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const skuId = searchParams.get('sku_id')
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('inventory_reservations')
      .select(`
        id,
        sku_id,
        order_id,
        quantity,
        status,
        reserved_at,
        expires_at,
        converted_at,
        cancelled_at,
        sku:shelf_skus(sku_code, variant_combination, product:shelf_products(id, name, thumbnail_url)),
        order:shelf_orders(order_number, total_amount, payment_status)
      `, { count: 'exact' })

    if (status && STATUSES.includes(status)) query = query.eq('status', status)
    if (skuId) query = query.eq('sku_id', skuId)

    query = query.order('reserved_at', { ascending: false })

    const { data, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (error) throw new Error(error.message)

    const raw = (data ?? []) as unknown as RawReservation[]

    const reservations: StockReservationRow[] = raw.map((reservation) => ({
      id: reservation.id,
      sku_id: reservation.sku_id,
      product_id: reservation.sku?.product?.id ?? '',
      order_id: reservation.order_id,
      order_number: reservation.order?.order_number ?? null,
      quantity: reservation.quantity,
      status: reservation.status,
      reserved_at: reservation.reserved_at,
      expires_at: reservation.expires_at,
      converted_at: reservation.converted_at,
      cancelled_at: reservation.cancelled_at,
      sku_code: reservation.sku?.sku_code ?? null,
      variant_combination: reservation.sku?.variant_combination ?? {},
      product_name: reservation.sku?.product?.name ?? null,
      product_thumbnail: reservation.sku?.product?.thumbnail_url ?? null,
      total_amount: reservation.order?.total_amount ?? null,
      payment_status: reservation.order?.payment_status ?? null,
    }))

    return NextResponse.json({
      reservations,
      total: count ?? reservations.length,
      page,
      pageSize: PAGE_SIZE,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
