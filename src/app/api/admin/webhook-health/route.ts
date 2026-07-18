import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { getWebhookHealthData, reprocessStoredWebhookEvent } from '@/lib/payments/service'
import { mapPaymentEventData, mapReconciliationRunData } from '@/lib/payments/admin'

type Body = {
  eventId?: unknown
}

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getWebhookHealthData()
    return NextResponse.json({
      health: data.health,
      events: data.events.map(mapPaymentEventData),
      reconciliationRuns: data.reconciliationRuns.map(mapReconciliationRunData),
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = await request.json().catch(() => ({})) as Body
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : ''
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required.' }, { status: 400 })
    }

    const result = await reprocessStoredWebhookEvent(eventId)
    return NextResponse.json(result)
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
