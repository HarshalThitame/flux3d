import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import {
  mapShopAdminOrder,
  shopOrderStatuses,
  shopPaymentStatuses,
  type ShopAdminOrder,
  type ShopOrderCustomer,
  type ShopOrderStatus,
  type ShopPaymentStatus,
} from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  phone_number: string | null
}

function parsePositiveInteger(value: string | null, fallback: number, max?: number) {
  const next = Number(value)
  if (!Number.isInteger(next) || next <= 0) return fallback
  return max ? Math.min(next, max) : next
}

function getAddressCustomer(row: Record<string, unknown>): Pick<ShopOrderCustomer, 'name' | 'phone'> {
  const address = row.shipping_address && typeof row.shipping_address === 'object'
    ? row.shipping_address as Record<string, unknown>
    : {}
  return {
    name: address.name ? String(address.name) : null,
    phone: address.phone ? String(address.phone) : null,
  }
}

async function attachCustomers(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  rows: Record<string, unknown>[]
) {
  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id)).filter(Boolean)))
  const profiles = new Map<string, ProfileRow>()

  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number')
      .in('id', userIds)

    if (error) throw new Error(error.message)
    ;(data ?? []).forEach((profile) => profiles.set(profile.id, profile as ProfileRow))
  }

  return rows.map((row) => {
    const profile = profiles.get(String(row.user_id))
    const addressCustomer = getAddressCustomer(row)
    const customer: ShopOrderCustomer = {
      id: String(row.user_id),
      name: profile?.full_name ?? addressCustomer.name,
      email: profile?.email ?? null,
      phone: profile?.phone_number ?? addressCustomer.phone,
    }

    return mapShopAdminOrder(row, customer)
  })
}

function orderMatchesSearch(order: ShopAdminOrder, search: string) {
  const query = search.toLowerCase()
  return [
    order.order_number,
    order.shipping_address.name,
    order.shipping_address.phone,
    order.customer?.name,
    order.customer?.email,
    order.customer?.phone,
  ].some((value) => value?.toLowerCase().includes(query))
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status') ?? searchParams.get('payment')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')?.trim() ?? ''
    const page = parsePositiveInteger(searchParams.get('page'), 1)
    const limit = parsePositiveInteger(searchParams.get('limit'), 20, 100)
    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('shelf_orders')
      .select('*')
      .order('placed_at', { ascending: false })
      .limit(500)

    if (status && shopOrderStatuses.includes(status as ShopOrderStatus)) {
      query = query.eq('order_status', status)
    }
    if (paymentStatus && shopPaymentStatuses.includes(paymentStatus as ShopPaymentStatus)) {
      query = query.eq('payment_status', paymentStatus)
    }
    if (dateFrom) query = query.gte('placed_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('placed_at', `${dateTo}T23:59:59.999Z`)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const mapped = await attachCustomers(supabase, (data ?? []) as Record<string, unknown>[])
    const filtered = search ? mapped.filter((order) => orderMatchesSearch(order, search)) : mapped
    const start = (page - 1) * limit

    return NextResponse.json({
      orders: filtered.slice(start, start + limit),
      page,
      limit,
      total: filtered.length,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
