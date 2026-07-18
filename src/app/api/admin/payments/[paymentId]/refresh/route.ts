import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { refreshPaymentAttemptFromProvider } from '@/lib/payments/service'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { paymentId } = await params
    const refreshed = await refreshPaymentAttemptFromProvider(paymentId)
    return NextResponse.json({ refreshed })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
