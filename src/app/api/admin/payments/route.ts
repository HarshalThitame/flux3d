import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdminPermission('payments.view')
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const statusFilter = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('payment_attempts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilter) query = query.eq('status', statusFilter)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const rows = data ?? []

    // Resolve customer names/emails: profiles for logged-in payments,
    // guest_contact email snapshots for guest (customer_id IS NULL) payments.
    const customerIds = Array.from(new Set(rows.map((row) => row.customer_id ? String(row.customer_id) : '').filter(Boolean)))
    const shopOrderIds = Array.from(new Set(
      rows
        .filter((row) => String(row.internal_order_type ?? '') === 'shop_order')
        .map((row) => String(row.internal_order_id ?? ''))
        .filter(Boolean)
    ))

    const [profilesRes, shopOrdersRes] = await Promise.all([
      customerIds.length
        ? supabase.from('profiles').select('id, full_name, email').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      shopOrderIds.length
        ? supabase.from('shelf_orders').select('id, user_id, shipping_address, guest_contact').in('id', shopOrderIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (profilesRes.error) throw new Error(profilesRes.error.message)
    if (shopOrdersRes.error) throw new Error(shopOrdersRes.error.message)

    const profilesById = new Map((profilesRes.data ?? []).map((p) => [String(p.id), p]))
    const guestEmailByOrderId = new Map(
      (shopOrdersRes.data ?? [])
        .filter((o) => !o.user_id && o.guest_contact && typeof o.guest_contact === 'object')
        .map((o) => {
          const contact = o.guest_contact as Record<string, unknown>
          return [String(o.id), typeof contact.email === 'string' ? contact.email.trim() : '']
        })
    )

    const payments = rows.map((row) => {
      const profile = row.customer_id ? profilesById.get(String(row.customer_id)) : undefined
      const metadata = row.metadata && typeof row.metadata === 'object'
        ? row.metadata as Record<string, unknown>
        : {}
      const metadataCustomer = metadata.customer && typeof metadata.customer === 'object'
        ? metadata.customer as Record<string, unknown>
        : {}
      const attempt = row.internal_order_type === 'shop_order'
        ? guestEmailByOrderId.get(String(row.internal_order_id ?? '')) ?? ''
        : ''
      const name = profile?.full_name
        ?? (typeof metadataCustomer.name === 'string' && metadataCustomer.name.trim() ? metadataCustomer.name.trim() : null)
        ?? 'Guest'
      const email = profile?.email ?? (attempt || null)

      return {
        id: String(row.id),
        internalOrderType: String(row.internal_order_type ?? ''),
        internalOrderId: String(row.internal_order_id ?? ''),
        customerId: row.customer_id ? String(row.customer_id) : '',
        provider: String(row.provider ?? ''),
        amountPaise: Number(row.amount_paise ?? 0),
        currency: String(row.currency ?? 'INR'),
        status: String(row.status ?? ''),
        providerOrderId: String(row.provider_order_id ?? ''),
        providerPaymentId: String(row.provider_payment_id ?? ''),
        paymentMethod: String(row.payment_method ?? ''),
        orderNumber: String(row.receipt ?? row.id ?? '').slice(0, 20),
        customer: name,
        customerEmail: email ?? '',
        isGuest: !row.customer_id,
        createdAt: String(row.created_at ?? ''),
      }
    })

    const totalCollected = payments
      .filter((p) => ['paid', 'captured'].includes(p.status))
      .reduce((sum, p) => sum + p.amountPaise, 0)
    const pendingAmount = payments
      .filter((p) => ['pending', 'created', 'authorized'].includes(p.status))
      .reduce((sum, p) => sum + p.amountPaise, 0)
    const refundedAmount = payments
      .filter((p) => ['refunded', 'partially_refunded'].includes(p.status))
      .reduce((sum, p) => sum + p.amountPaise, 0)

    return NextResponse.json({
      payments,
      summary: {
        totalCollected,
        pending: pendingAmount,
        refunded: refundedAmount,
        gatewayFees: 0,
      },
      page,
      limit,
      total: count ?? 0,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
