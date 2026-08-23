import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { getPaymentAttemptDetail } from '@/lib/payments/service'
import { mapPaymentAuditLogData, mapPaymentData, mapPaymentEventData, mapPaymentRefundData } from '@/lib/payments/admin'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function getCustomerContext(order: Record<string, unknown> | null, attemptMetadata: Record<string, unknown>) {
  const metadataCustomer = asRecord(attemptMetadata.customer)
  const orderCustomer = order ? asRecord(order.customer) : {}
  const shippingAddress = order ? asRecord(order.shipping_address) : {}
  const guestContact = order ? asRecord(order.guest_contact) : {}
  return {
    name: String(metadataCustomer.name ?? orderCustomer.name ?? shippingAddress.name ?? order?.full_name ?? order?.name ?? 'Unknown'),
    email: String(metadataCustomer.email ?? orderCustomer.email ?? guestContact.email ?? order?.email ?? ''),
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireAdminPermission('payments.view')
  if ('response' in auth) return auth.response

  try {
    const { paymentId } = await params
    const detail = await getPaymentAttemptDetail(paymentId)
    const customer = getCustomerContext(detail.internalOrder, detail.attempt.metadata)

    return NextResponse.json({
      payment: {
        ...mapPaymentData(detail.attempt, customer.name, customer.email),
        metadata: detail.attempt.metadata,
      },
      order: detail.internalOrder,
      refunds: detail.refunds.map(mapPaymentRefundData),
      events: detail.events.map(mapPaymentEventData),
      auditLogs: detail.auditLogs.map(mapPaymentAuditLogData),
      providerDashboard: detail.providerDashboard,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
