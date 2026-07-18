import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { getWebhookHealthData, runPaymentReconciliation } from '@/lib/payments/service'
import { mapReconciliationRunData } from '@/lib/payments/admin'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getWebhookHealthData()
    return NextResponse.json({
      reconciliationRuns: data.reconciliationRuns.map(mapReconciliationRunData),
      webhookHealth: data.health,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const result = await runPaymentReconciliation()
    return NextResponse.json({
      run: mapReconciliationRunData(result.run),
      summary: result.summary,
      providerPayments: result.providerPayments,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
