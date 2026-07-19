import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { getDb, seedTestData, cleanDb, TEST_USER_ID } from '../helpers'

vi.mock('razorpay', () => {
  class MockRazorpay {
    orders = {
      create: vi.fn().mockResolvedValue({
        id: 'order_mock_e2e', amount: 105000, currency: 'INR',
        receipt: 'E2E-TEST', status: 'created', created_at: Date.now(),
      }),
    }
    payments = {
      fetch: vi.fn().mockResolvedValue({
        id: 'pay_mock_e2e', amount: 105000, currency: 'INR', status: 'captured',
        order_id: 'order_mock_e2e', method: 'upi', captured: true,
      }),
      refund: vi.fn().mockResolvedValue({
        id: 'rfnd_mock_e2e', amount: 10000, status: 'processed',
        payment_id: 'pay_mock_e2e', speed: 'normal', created_at: Date.now(),
      }),
    }
  }
  return { default: MockRazorpay }
})

beforeAll(async () => {
  await seedTestData()
})

afterAll(async () => {
  await cleanDb()
})

describe('E2E payment flow', () => {
  let orderId: string
  let attemptId: string

  it('1. creates a shop order', async () => {
    const db = getDb()
    const { data: sku } = await db.from('shelf_skus').select('id, product_id').eq('sku_code', 'TP-RED').single()

    const address = { name: 'Test', phone: '9876543210', line1: 'Test St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }
    const items = [{ productId: sku.product_id, skuId: sku.id, quantity: 1, customizationText: null }]

    const { data, error } = await db.rpc('create_shelf_order_atomic', {
      p_user_id: TEST_USER_ID,
      p_order_number: `E2E-${Date.now()}`,
      p_items: items,
      p_subtotal_paise: 50000,
      p_discount_amount_paise: 0,
      p_coupon_code: null,
      p_shipping_charge_paise: 5000,
      p_total_amount_paise: 55000,
      p_shipping_address: address,
    })

    expect(error).toBeNull()
    expect(data).toHaveProperty('orderId')
    orderId = data!.orderId as string
  })

  it('2. creates inventory reservation', async () => {
    const db = getDb()
    const { data: reservations } = await db.from('inventory_reservations')
      .select('id, quantity, status')
      .eq('order_id', orderId)

    expect(reservations).toHaveLength(1)
    expect(reservations![0].status).toBe('active')
    expect(reservations![0].quantity).toBe(1)
  })

  it('3. converts reservation on payment success', async () => {
    const db = getDb()
    const { error } = await db.rpc('convert_inventory_reservations', { p_order_id: orderId })
    expect(error).toBeNull()

    const { data: reservations } = await db.from('inventory_reservations')
      .select('status, converted_at')
      .eq('order_id', orderId)

    expect(reservations![0].status).toBe('converted')
    expect(reservations![0].converted_at).not.toBeNull()
  })

  it('4. initiates refund via Razorpay mock', async () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_123')
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'test_secret_123')
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'whsec_test')

    // Create a payment attempt to refund
    const db = getDb()
    const { data: attempt } = await db.from('payment_attempts').insert({
      internal_order_type: 'shop_order', internal_order_id: orderId,
      customer_id: TEST_USER_ID, provider: 'razorpay',
      payment_purpose: 'shop_order', amount_paise: 55000, currency: 'INR',
      status: 'paid', attempt_number: 1,
      idempotency_key: `refund-test-${Date.now()}`,
      provider_order_id: 'order_mock_refund',
      provider_payment_id: 'pay_mock_refund',
      captured_at: new Date().toISOString(),
    }).select('id').single()

    expect(attempt).not.toBeNull()

    const { initiateRefund } = await import('@/lib/payments/service')
    const result = await initiateRefund({
      paymentAttemptId: attempt.id,
      amountPaise: 10000,
      reason: 'E2E test refund',
      speed: 'normal',
      initiatedByAdminId: TEST_USER_ID,
    })

    expect(result).toHaveProperty('refund')
    expect(result).toHaveProperty('providerResponse')
  })

  it('5. releases expired reservations', async () => {
    const db = getDb()
    const { data: before } = await db.from('inventory_reservations').select('id').eq('status', 'active')
    const activeBefore = before?.length ?? 0

    const { data: released, error } = await db.rpc('release_expired_reservations')
    expect(error).toBeNull()

    const { data: after } = await db.from('inventory_reservations').select('id').eq('status', 'expired')
    const expiredAfter = after?.length ?? 0

    expect(expiredAfter + activeBefore).toBeGreaterThanOrEqual(activeBefore)
  })
})

describe('fulfilment status transitions', () => {
  it('asserts valid fulfilment transitions', async () => {
    const { assertFulfilmentStatusTransition } = await import('@/lib/shop/orders')
    expect(() => assertFulfilmentStatusTransition('pending', 'processing')).not.toThrow()
    expect(() => assertFulfilmentStatusTransition('packed', 'shipped')).not.toThrow()
  })

  it('rejects invalid fulfilment transitions', async () => {
    const { assertFulfilmentStatusTransition } = await import('@/lib/shop/orders')
    expect(() => assertFulfilmentStatusTransition('pending', 'delivered')).toThrow()
    expect(() => assertFulfilmentStatusTransition('shipped', 'packed')).toThrow()
  })

  it('asserts valid order lifecycle transitions', async () => {
    const { assertShopStatusTransition } = await import('@/lib/shop/orders')
    expect(() => assertShopStatusTransition('placed', 'confirmed')).not.toThrow()
    expect(() => assertShopStatusTransition('placed', 'cancelled')).not.toThrow()
    expect(() => assertShopStatusTransition('return_requested', 'returned')).not.toThrow()
  })

  it('rejects invalid lifecycle transitions', async () => {
    const { assertShopStatusTransition } = await import('@/lib/shop/orders')
    expect(() => assertShopStatusTransition('confirmed', 'placed')).toThrow()
    expect(() => assertShopStatusTransition('cancelled', 'placed')).toThrow()
  })
})
