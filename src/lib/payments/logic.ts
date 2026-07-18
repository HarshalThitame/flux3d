import type { PaymentAttemptRecord, PaymentEventRecord, PaymentStatus } from './types'

export function assertPaymentStatusTransition(current: PaymentStatus, next: PaymentStatus) {
  if (current === next) return

  const allowed: Partial<Record<PaymentStatus, PaymentStatus[]>> = {
    created: ['pending', 'cancelled', 'failed'],
    pending: ['authorized', 'captured', 'paid', 'failed', 'cancelled'],
    authorized: ['captured', 'paid', 'failed', 'cancelled'],
    captured: ['paid', 'partially_refunded', 'refunded', 'disputed'],
    paid: ['partially_refunded', 'refunded', 'disputed'],
    failed: ['created', 'cancelled'],
    cancelled: [],
    partially_refunded: ['refunded', 'disputed'],
    refunded: [],
    disputed: ['refunded'],
  }

  if (!allowed[current]?.includes(next)) {
    throw new Error(`Cannot change payment from ${current} to ${next}.`)
  }
}

export function calculateRefundableBalance(
  capturedAmountPaise: number,
  refundedAmountsPaise: number[]
) {
  const captured = Math.max(0, Math.round(Number(capturedAmountPaise) || 0))
  const refunded = refundedAmountsPaise.reduce((sum, value) => sum + Math.max(0, Math.round(Number(value) || 0)), 0)
  return Math.max(0, captured - refunded)
}

export function summarizeWebhookHealth(events: PaymentEventRecord[]) {
  const total = events.length
  const processed = events.filter((event) => event.processing_status === 'processed').length
  const failed = events.filter((event) => event.processing_status === 'failed').length
  const ignored = events.filter((event) => event.processing_status === 'ignored').length
  const duplicates = new Set(events.map((event) => event.provider_event_id)).size
  const duplicateCount = Math.max(0, total - duplicates)
  const lastReceivedAt = events[0]?.received_at ?? null
  const lastProcessedAt = events.find((event) => event.processed_at)?.processed_at ?? null

  return {
    total,
    processed,
    failed,
    ignored,
    duplicateCount,
    lastReceivedAt,
    lastProcessedAt,
  }
}

export function summarizeReconciliation(
  attempts: PaymentAttemptRecord[],
  providerPayments: Array<{ id: string; amount: number; currency: string; status: string }>
) {
  const localByProviderPaymentId = new Map(
    attempts
      .filter((attempt) => attempt.provider === 'razorpay' && attempt.provider_payment_id)
      .map((attempt) => [attempt.provider_payment_id as string, attempt])
  )

  const mismatches = providerPayments.filter((payment) => {
    const local = localByProviderPaymentId.get(payment.id)
    if (!local) return true
    if (Math.round(Number(local.amount_paise) || 0) !== Math.round(Number(payment.amount) || 0)) return true
    if (String(local.currency || '').toUpperCase() !== String(payment.currency || '').toUpperCase()) return true
    return false
  })

  const missingLocally = providerPayments.filter((payment) => !localByProviderPaymentId.has(payment.id))

  return {
    totalAttempts: attempts.length,
    totalProviderPayments: providerPayments.length,
    mismatchCount: mismatches.length,
    missingLocallyCount: missingLocally.length,
    mismatches,
    missingLocally,
  }
}
