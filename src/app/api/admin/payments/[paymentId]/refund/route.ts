import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { initiateRefund } from '@/lib/payments/service'

type Body = {
  amountPaise?: unknown
  reason?: unknown
  speed?: unknown
}

const LARGE_REFUND_THRESHOLD_PAISE = 5_000_000 // ₹50,000

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireAdminPermission('refunds.create')
  if ('response' in auth) return auth.response

  try {
    const { paymentId } = await params
    const body = await request.json().catch(() => ({})) as Body
    const amountPaise = Math.max(0, Math.round(Number(body.amountPaise ?? 0)))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const speed = body.speed === 'optimum' ? 'optimum' : 'normal'

    if (!amountPaise || !reason) {
      return NextResponse.json({ error: 'Amount and reason are required.' }, { status: 400 })
    }

    if (amountPaise >= LARGE_REFUND_THRESHOLD_PAISE && !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Refunds above ₹50,000 require super-admin approval.' },
        { status: 403 }
      )
    }

    const result = await initiateRefund({
      paymentAttemptId: paymentId,
      amountPaise,
      reason,
      speed,
      initiatedByAdminId: auth.user.id,
    })

    return NextResponse.json({ refund: result.refund, providerResponse: result.providerResponse })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
