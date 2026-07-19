import { describe, expect, it } from 'vitest'

const fixturePaymentCaptured = {
  event: 'payment.captured',
  payload: {
    payment: { id: 'pay_test_captured', amount: 50000, currency: 'INR', status: 'captured', order_id: 'order_test', method: 'upi', captured: true },
    order: { id: 'order_test' },
  },
}

const fixturePaymentFailed = {
  event: 'payment.failed',
  payload: {
    payment: { id: 'pay_test_failed', amount: 50000, currency: 'INR', status: 'failed', order_id: 'order_test', error_code: 'BAD_OTP', error_description: 'OTP verification failed' },
    order: { id: 'order_test' },
  },
}

const fixtureRefundProcessed = {
  event: 'refund.processed',
  payload: {
    refund: { id: 'rfnd_test', amount: 25000, status: 'processed', payment_id: 'pay_test_captured', speed: 'normal', created_at: Date.now() },
    payment: { id: 'pay_test_captured' },
  },
}

describe('webhook fixture shapes', () => {
  it('payment.captured fixture has required fields', () => {
    expect(fixturePaymentCaptured.event).toBe('payment.captured')
    expect(fixturePaymentCaptured.payload.payment.id).toBe('pay_test_captured')
    expect(fixturePaymentCaptured.payload.payment.captured).toBe(true)
    expect(fixturePaymentCaptured.payload.payment.amount).toBe(50000)
  })

  it('payment.failed fixture has error details', () => {
    expect(fixturePaymentFailed.event).toBe('payment.failed')
    expect(fixturePaymentFailed.payload.payment.error_code).toBe('BAD_OTP')
    expect(fixturePaymentFailed.payload.payment.status).toBe('failed')
  })

  it('refund.processed fixture has refund amount', () => {
    expect(fixtureRefundProcessed.event).toBe('refund.processed')
    expect(fixtureRefundProcessed.payload.refund.amount).toBe(25000)
    expect(fixtureRefundProcessed.payload.refund.status).toBe('processed')
  })
})
