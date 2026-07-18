import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { getAdminRefundsData } from '@/lib/payments/service'
import { mapPaymentRefundData, mapPaymentData } from '@/lib/payments/admin'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getAdminRefundsData()
    return NextResponse.json({
      refunds: data.refunds.map(mapPaymentRefundData),
      payments: data.attempts.map((attempt) => mapPaymentData(attempt)),
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
