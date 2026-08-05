import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  try {
    const params = await context.params
    const userId = params.id
    const supabase = createAdminSupabaseClient()

    const { data: attempts, error } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    const paymentIds = (attempts || []).map((a) => a.id)
    const { data: refunds } = paymentIds.length
      ? await supabase
          .from('payment_refunds')
          .select('*')
          .in('payment_attempt_id', paymentIds)
          .order('created_at', { ascending: false })
      : { data: [] }

    const refundsByAttempt =
      (refunds || []).reduce<Record<string, { status: string; amountPaise: number }[]>>((acc, r) => {
        const id = String(r.payment_attempt_id)
        acc[id] = acc[id] || []
        acc[id].push({ status: r.status, amountPaise: Number(r.amount_paise ?? 0) })
        return acc
      }, {})

    const payments = (attempts || []).map((attempt) => {
      const metadata =
        attempt.metadata && typeof attempt.metadata === 'object' && !Array.isArray(attempt.metadata)
          ? (attempt.metadata as Record<string, unknown>)
          : {}
      const attemptRefunds = refundsByAttempt[String(attempt.id)] || []
      const refundedAmount = attemptRefunds
        .filter((r) => r.status === 'processed' || r.status === 'pending')
        .reduce((sum, r) => sum + r.amountPaise, 0)

      return {
        id: String(attempt.id),
        orderNumber: String(metadata.orderNumber ?? metadata.order_number ?? attempt.internal_order_id),
        internalOrderType: attempt.internal_order_type,
        amountPaise: Number(attempt.amount_paise ?? 0),
        currency: attempt.currency,
        provider: attempt.provider,
        paymentPurpose: attempt.payment_purpose,
        status: attempt.status,
        paymentMethod: attempt.payment_method,
        attemptNumber: attempt.attempt_number,
        receipt: attempt.receipt,
        refundedAmountPaise: refundedAmount,
        createdAt: attempt.created_at,
        capturedAt: attempt.captured_at,
      }
    })

    return NextResponse.json({ payments })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}