import { describe, expect, it, vi, afterEach } from 'vitest'
import crypto from 'node:crypto'

afterEach(() => {
  vi.unstubAllEnvs()
})

vi.mock('razorpay', () => {
  class MockRazorpay {
    orders = {
      create: vi.fn().mockResolvedValue({
        id: 'order_mock_123',
        amount: 50000,
        currency: 'INR',
        receipt: 'TEST-RCPT',
        status: 'created',
        created_at: Date.now(),
      }),
    }
    payments = {
      fetch: vi.fn().mockResolvedValue({
        id: 'pay_mock_123',
        amount: 50000,
        currency: 'INR',
        status: 'captured',
        order_id: 'order_mock_123',
        method: 'upi',
        captured: true,
      }),
    }
  }
  return { default: MockRazorpay }
})

function computeCheckoutSignature(orderId: string, paymentId: string, secret: string) {
  const body = `${orderId}|${paymentId}`
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

function computeWebhookSignature(rawBody: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

function stubRazorpayEnv() {
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_123')
  vi.stubEnv('RAZORPAY_KEY_SECRET', 'test_secret_123')
  vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'whsec_test')
}

describe('verifyRazorpayCheckoutSignature', () => {
  it('verifies correct checkout signature', async () => {
    stubRazorpayEnv()
    const { verifyRazorpayCheckoutSignature } = await import('../razorpay')
    const orderId = 'order_rzp_test123'
    const paymentId = 'pay_rzp_test456'
    const signature = computeCheckoutSignature(orderId, paymentId, 'test_secret_123')
    expect(verifyRazorpayCheckoutSignature({ orderId, paymentId, signature })).toBe(true)
  })

  it('rejects invalid checkout signature', async () => {
    stubRazorpayEnv()
    const { verifyRazorpayCheckoutSignature } = await import('../razorpay')
    expect(verifyRazorpayCheckoutSignature({ orderId: 'o1', paymentId: 'p1', signature: 'bad_sig' })).toBe(false)
  })

  it('throws when credentials are not configured', async () => {
    const { verifyRazorpayCheckoutSignature } = await import('../razorpay')
    expect(() => verifyRazorpayCheckoutSignature({ orderId: 'o1', paymentId: 'p1', signature: 'sig' })).toThrow('Razorpay credentials')
  })

  it('rejects empty parameters', async () => {
    stubRazorpayEnv()
    const { verifyRazorpayCheckoutSignature } = await import('../razorpay')
    expect(verifyRazorpayCheckoutSignature({ orderId: '', paymentId: '', signature: '' })).toBe(false)
  })
})

describe('verifyRazorpayWebhookSignature', () => {
  it('verifies correct webhook signature', async () => {
    stubRazorpayEnv()
    const { verifyRazorpayWebhookSignature } = await import('../razorpay')
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { id: 'pay_test' } } })
    const signature = computeWebhookSignature(rawBody, 'whsec_test')
    expect(verifyRazorpayWebhookSignature(rawBody, signature)).toBe(true)
  })

  it('rejects invalid webhook signature', async () => {
    stubRazorpayEnv()
    const { verifyRazorpayWebhookSignature } = await import('../razorpay')
    expect(verifyRazorpayWebhookSignature(JSON.stringify({ event: 'payment.captured' }), 'bad_sig')).toBe(false)
  })

  it('throws when webhook secret is not configured', async () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_123')
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'test_secret_123')
    const { verifyRazorpayWebhookSignature } = await import('../razorpay')
    expect(() => verifyRazorpayWebhookSignature('body', 'sig')).toThrow('Razorpay credentials')
  })

  it('handles empty body', async () => {
    stubRazorpayEnv()
    const { verifyRazorpayWebhookSignature } = await import('../razorpay')
    expect(verifyRazorpayWebhookSignature('', 'sig')).toBe(false)
  })
})

describe('createRazorpayOrder', () => {
  it('creates Razorpay order via mocked SDK', async () => {
    stubRazorpayEnv()
    const { createRazorpayOrder } = await import('../razorpay')
    const result = await createRazorpayOrder({
      amountPaise: 50000,
      currency: 'INR',
      receipt: 'TEST-RCPT',
      notes: { order_type: 'test' },
    })
    expect(result).toHaveProperty('id')
    expect(result.amount).toBe(50000)
    expect(result.currency).toBe('INR')
  })
})
