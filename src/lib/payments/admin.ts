import type {
  PaymentAttemptRecord,
  PaymentEventRecord,
  PaymentRefundRecord,
} from './types'
import type {
  PaymentAuditLogData,
  PaymentData,
  PaymentEventData,
  PaymentRefundData,
  ReconciliationRunData,
} from '@/lib/admin/types'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function mapPaymentData(attempt: PaymentAttemptRecord, customerName = 'Unknown', customerEmail: string | null = null): PaymentData & { metadata: Record<string, unknown>; customerId: string } {
  const metadata = asRecord(attempt.metadata)
  return {
    id: attempt.id,
    orderNumber: String(metadata.orderNumber ?? metadata.order_number ?? attempt.internal_order_id),
    internalOrderType: attempt.internal_order_type,
    internalOrderId: attempt.internal_order_id,
    customer: customerName,
    customerEmail,
    amountPaise: Number(attempt.amount_paise ?? 0),
    currency: attempt.currency,
    provider: attempt.provider,
    providerOrderId: attempt.provider_order_id,
    providerPaymentId: attempt.provider_payment_id,
    paymentPurpose: attempt.payment_purpose,
    status: attempt.status,
    paymentMethod: attempt.payment_method,
    refundStatus: attempt.status === 'partially_refunded' || attempt.status === 'refunded' ? attempt.status : null,
    attemptNumber: attempt.attempt_number,
    receipt: attempt.receipt,
    createdAt: attempt.created_at,
    capturedAt: attempt.captured_at,
    failedAt: attempt.failed_at,
    metadata,
    customerId: attempt.customer_id,
  }
}

export function mapPaymentRefundData(refund: PaymentRefundRecord): PaymentRefundData {
  return {
    id: refund.id,
    paymentAttemptId: refund.payment_attempt_id,
    providerRefundId: refund.provider_refund_id,
    amountPaise: refund.amount_paise,
    status: refund.status,
    reason: refund.reason,
    speed: refund.speed,
    initiatedByAdminId: refund.initiated_by_admin_id,
    providerResponse: refund.provider_response,
    createdAt: refund.created_at,
    processedAt: refund.processed_at,
    failedAt: refund.failed_at,
  }
}

export function mapPaymentEventData(event: PaymentEventRecord): PaymentEventData {
  return {
    id: event.id,
    provider: event.provider,
    providerEventId: event.provider_event_id,
    eventType: event.event_type,
    providerOrderId: event.provider_order_id,
    providerPaymentId: event.provider_payment_id,
    signatureVerified: event.signature_verified,
    processingStatus: event.processing_status,
    retryCount: event.retry_count,
    sanitizedPayload: event.sanitized_payload,
    processingError: event.processing_error,
    receivedAt: event.received_at,
    processedAt: event.processed_at,
  }
}

export function mapPaymentAuditLogData(row: Record<string, unknown>): PaymentAuditLogData {
  return {
    id: String(row.id),
    actorId: row.actor_id ? String(row.actor_id) : null,
    actorRole: String(row.actor_role ?? 'system'),
    action: String(row.action ?? ''),
    entityType: String(row.entity_type ?? ''),
    entityId: String(row.entity_id ?? ''),
    previousState: asRecord(row.previous_state),
    newState: asRecord(row.new_state),
    requestContext: asRecord(row.request_context),
    createdAt: String(row.created_at ?? ''),
  }
}

export function mapReconciliationRunData(row: Record<string, unknown>): ReconciliationRunData {
  return {
    id: String(row.id),
    dateRangeStart: row.date_range_start ? String(row.date_range_start) : null,
    dateRangeEnd: row.date_range_end ? String(row.date_range_end) : null,
    initiatedBy: row.initiated_by ? String(row.initiated_by) : null,
    status: String(row.status ?? ''),
    matchedCount: Number(row.matched_count ?? 0),
    mismatchCount: Number(row.mismatch_count ?? 0),
    missingCount: Number(row.missing_count ?? 0),
    report: asRecord(row.report),
    startedAt: String(row.started_at ?? ''),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  }
}
