import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { listPaymentAttempts } from '@/lib/payments/repository'

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

    const payments = (data ?? []).map((row) => ({
      id: String(row.id),
      internalOrderType: String(row.internal_order_type ?? ''),
      internalOrderId: String(row.internal_order_id ?? ''),
      customerId: String(row.customer_id ?? ''),
      provider: String(row.provider ?? ''),
      amountPaise: Number(row.amount_paise ?? 0),
      currency: String(row.currency ?? 'INR'),
      status: String(row.status ?? ''),
      providerOrderId: String(row.provider_order_id ?? ''),
      providerPaymentId: String(row.provider_payment_id ?? ''),
      paymentMethod: String(row.payment_method ?? ''),
      orderNumber: String(row.receipt ?? row.id ?? '').slice(0, 20),
      customer: String(row.customer_id ?? '').slice(0, 8),
      customerEmail: '',
      createdAt: String(row.created_at ?? ''),
    }))

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
