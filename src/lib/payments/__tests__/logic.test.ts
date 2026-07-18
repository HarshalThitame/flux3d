import crypto from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertPaymentStatusTransition,
  calculateRefundableBalance,
  summarizeReconciliation,
  summarizeWebhookHealth,
} from '../logic'
import {
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from '../razorpay'
import type { PaymentAttemptRecord, PaymentEventRecord } from '../types'

afterEach(() => {
  vi.unstubAllEnvs()
})

const baseAttempt: PaymentAttemptRecord = {
  id: 'attempt_1',
  internal_order_type: 'shop_order',
  internal_order_id: 'order_1',
  customer_id: 'user_1',
  provider: 'razorpay',
  payment_purpose: 'shop_order',
  provider_order_id: 'order_rzp_1',
  provider_payment_id: 'pay_rzp_1',
  amount_paise: 15000,
  currency: 'INR',
  status: 'paid',
  attempt_number: 1,
  idempotency_key: 'shop_order:order_1:shop_order:1:15000',
  receipt: 'FLX3D-1-test',
  failure_code: null,
  failure_description: null,
  payment_method: 'upi',
  captured_at: '2026-07-18T10:00:00.000Z',
  failed_at: null,
  metadata: {},
  created_at: '2026-07-18T09:59:00.000Z',
  updated_at: '2026-07-18T10:00:00.000Z',
}

describe('payment logic', () => {
  it('allows valid payment status transitions and rejects invalid ones', () => {
    expect(() => assertPaymentStatusTransition('created', 'pending')).not.toThrow()
    expect(() => assertPaymentStatusTransition('pending', 'captured')).not.toThrow()
    expect(() => assertPaymentStatusTransition('paid', 'refunded')).not.toThrow()
    expect(() => assertPaymentStatusTransition('created', 'paid')).toThrow('Cannot change payment from created to paid.')
  })

  it('calculates refundable balance from captured and refunded values', () => {
    expect(calculateRefundableBalance(15000, [2500, 500])).toBe(12000)
    expect(calculateRefundableBalance(15000, [20000])).toBe(0)
  })

  it('summarizes webhook health and duplicate events', () => {
    const events: PaymentEventRecord[] = [
      {
        id: 'event_1',
        provider: 'razorpay',
        provider_event_id: 'evt_1',
        event_type: 'payment.captured',
        provider_order_id: 'order_rzp_1',
        provider_payment_id: 'pay_rzp_1',
        signature_verified: true,
        processing_status: 'processed',
        retry_count: 0,
        sanitized_payload: {},
        processing_error: null,
        received_at: '2026-07-18T10:00:00.000Z',
        processed_at: '2026-07-18T10:00:01.000Z',
      },
      {
        id: 'event_2',
        provider: 'razorpay',
        provider_event_id: 'evt_1',
        event_type: 'payment.captured',
        provider_order_id: 'order_rzp_1',
        provider_payment_id: 'pay_rzp_1',
        signature_verified: true,
        processing_status: 'failed',
        retry_count: 1,
        sanitized_payload: {},
        processing_error: 'duplicate',
        received_at: '2026-07-18T10:01:00.000Z',
        processed_at: null,
      },
    ]

    expect(summarizeWebhookHealth(events)).toEqual({
      total: 2,
      processed: 1,
      failed: 1,
      ignored: 0,
      duplicateCount: 1,
      lastReceivedAt: '2026-07-18T10:00:00.000Z',
      lastProcessedAt: '2026-07-18T10:00:01.000Z',
    })
  })

  it('summarizes reconciliation mismatches and missing provider payments', () => {
    const summary = summarizeReconciliation(
      [
        baseAttempt,
        {
          ...baseAttempt,
          id: 'attempt_2',
          internal_order_id: 'order_2',
          provider_payment_id: 'pay_rzp_2',
          amount_paise: 9999,
          currency: 'INR',
        },
      ],
      [
        { id: 'pay_rzp_1', amount: 15000, currency: 'INR', status: 'captured' },
        { id: 'pay_rzp_2', amount: 12000, currency: 'INR', status: 'captured' },
        { id: 'pay_rzp_3', amount: 5000, currency: 'INR', status: 'captured' },
      ]
    )

    expect(summary.totalAttempts).toBe(2)
    expect(summary.totalProviderPayments).toBe(3)
    expect(summary.mismatchCount).toBe(2)
    expect(summary.missingLocallyCount).toBe(1)
  })

  it('verifies Razorpay checkout signatures with the configured secret', () => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret_123')
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_123')
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'webhook_123')

    const orderId = 'order_ABC'
    const paymentId = 'pay_DEF'
    const signature = crypto
      .createHmac('sha256', 'secret_123')
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    expect(verifyRazorpayCheckoutSignature({
      orderId,
      paymentId,
      signature,
    })).toBe(true)
    expect(verifyRazorpayCheckoutSignature({
      orderId,
      paymentId,
      signature: 'bad-signature',
    })).toBe(false)
  })

  it('verifies Razorpay webhook signatures with the configured webhook secret', () => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret_123')
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_123')
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'webhook_123')

    const rawBody = JSON.stringify({ event: 'payment.captured' })
    const signature = crypto
      .createHmac('sha256', 'webhook_123')
      .update(rawBody)
      .digest('hex')

    expect(verifyRazorpayWebhookSignature(rawBody, signature)).toBe(true)
    expect(verifyRazorpayWebhookSignature(rawBody, 'bad-signature')).toBe(false)
  })
})
