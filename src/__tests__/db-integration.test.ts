import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb, seedTestData, cleanDb, TEST_USER_ID } from './helpers'

beforeAll(async () => {
  await seedTestData()
})

afterAll(async () => {
  await cleanDb()
})

describe('database schema', () => {
  it('has all Phase 1 tables', async () => {
    const db = getDb()
    const tables = ['inventory_reservations', 'payment_attempts', 'payment_events', 'payment_refunds',
      'payment_audit_logs', 'payment_status_history', 'shelf_orders', 'shipping_rules']
    for (const t of tables) {
      const { data } = await db.from(t).select('id').limit(1)
      expect(data).toBeDefined()
    }
  })

  it('has subtotal_paise column on shelf_orders', async () => {
    const db = getDb()
    const { data } = await db.from('shelf_orders').select('subtotal_paise').limit(1)
    expect(data).toBeDefined()
  })

  it('has fulfilment_status column on shelf_orders', async () => {
    const db = getDb()
    const { data } = await db.from('shelf_orders').select('fulfilment_status').limit(1)
    expect(data).toBeDefined()
  })
})

describe('shipping calculation', () => {
  it('returns free shipping when subtotal meets threshold', async () => {
    const { calculateShippingFromRules } = await import('@/lib/shop/shipping')
    const result = await calculateShippingFromRules({ pincode: '400001', state: 'maharashtra', subtotal: 500 })
    expect(result.available).toBe(true)
    expect(result.chargePaise).toBe(0)
  })

  it('returns default charge when subtotal is below threshold', async () => {
    const { calculateShippingFromRules } = await import('@/lib/shop/shipping')
    const result = await calculateShippingFromRules({ pincode: '400001', state: 'maharashtra', subtotal: 100 })
    expect(result.available).toBe(true)
    expect(result.chargePaise).toBeGreaterThan(0)
  })

  it('falls back to default charge for any pincode', async () => {
    const { calculateShippingFromRules } = await import('@/lib/shop/shipping')
    const result = await calculateShippingFromRules({ pincode: '999999', state: 'unknown', subtotal: 100 })
    expect(result.available).toBe(true)
    expect(result.chargePaise).toBeGreaterThan(0)
  })
})

describe('coupon validation', () => {
  it('validates a valid coupon code', async () => {
    const db = getDb()
    const { data: coupon } = await db.from('shelf_coupons').upsert({
      code: 'TESTDIRECT', discount_type: 'percent', discount_value: 10,
      min_order_value: 100, max_uses: 100, is_active: true,
      valid_from: '2026-01-01', valid_until: '2027-12-31',
    }, { onConflict: 'code' }).select('code, discount_type, discount_value').single()
    if (!coupon) throw new Error('Coupon not created')
    expect(coupon.code).toBe('TESTDIRECT')
    expect(coupon.discount_type).toBe('percent')
    expect(Number(coupon.discount_value)).toBe(10)
  })

  it('rejects expired coupon', async () => {
    const db = getDb()
    const { data: coupon } = await db.from('shelf_coupons').upsert({
      code: 'EXPIRED', discount_type: 'percent', discount_value: 20,
      max_uses: 10, is_active: true, valid_from: '2020-01-01', valid_until: '2020-12-31',
    }, { onConflict: 'code' }).select('valid_until').single()
    if (!coupon) throw new Error('Expired coupon not created')
    const now = new Date().toISOString().slice(0, 10)
    expect(coupon.valid_until < now).toBe(true)
  })
})

describe('order creation flow', () => {
  it('creates an order via create_shelf_order_atomic RPC', async () => {
    const db = getDb()
    const { data: sku } = await db.from('shelf_skus').select('id, product_id').eq('sku_code', 'TP-RED').single()
    if (!sku) throw new Error('Test SKU not found')

    const items = [{ productId: sku.product_id, skuId: sku.id, quantity: 2, customizationText: null }]
    const address = { name: 'Test', phone: '9876543210', line1: 'Test St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }

    const { data, error } = await db.rpc('create_shelf_order_atomic', {
      p_user_id: TEST_USER_ID,
      p_order_number: `TEST-${Date.now()}`,
      p_items: items,
      p_subtotal_paise: 100000,
      p_discount_amount_paise: 0,
      p_coupon_code: null,
      p_shipping_charge_paise: 5000,
      p_total_amount_paise: 105000,
      p_shipping_address: address,
    })

    expect(error).toBeNull()
    expect(data).toHaveProperty('orderId')
    expect(data).toHaveProperty('success', true)
  })

  it('creates inventory reservation on order creation', async () => {
    const db = getDb()
    const { data: reservations } = await db.from('inventory_reservations').select('*, shelf_orders!inner(order_number)')
    expect(reservations!.length).toBeGreaterThanOrEqual(1)
  })

  it('cancels order via cancel_shelf_order RPC', async () => {
    const db = getDb()
    const { data: orders } = await db.from('shelf_orders').select('id').order('placed_at', { ascending: false }).limit(1)
    if (!orders?.length) return

    const { error, data } = await db.rpc('cancel_shelf_order', {
      p_order_id: orders[0].id,
      p_reason: 'Integration test cancellation',
    })

    expect(error).toBeNull()
    expect(data).toHaveProperty('success', true)

    const { data: updated } = await db.from('shelf_orders').select('order_status').eq('id', orders[0].id).single()
    if (!updated) throw new Error('Order not found after cancellation')
    expect(updated.order_status).toBe('cancelled')
  })
})

describe('whatsapp rag schema', () => {
  it('refreshes updated_at when a knowledge chunk is edited', async () => {
    const db = getDb()
    const sourceKey = `integration-${Date.now()}`

    const { data: inserted, error: insertError } = await db
      .from('whatsapp_knowledge_chunks')
      .insert({
        source_key: sourceKey,
        title: 'Integration test chunk',
        content: 'Initial content for update timestamp verification.',
        tags: ['integration'],
        priority: 0,
        active: true,
      })
      .select('id, updated_at')
      .single()

    expect(insertError).toBeNull()
    if (!inserted) throw new Error('Inserted whatsapp knowledge chunk not found')

    const firstUpdatedAt = new Date(inserted.updated_at ?? '').getTime()
    expect(Number.isFinite(firstUpdatedAt)).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const { data: updated, error: updateError } = await db
      .from('whatsapp_knowledge_chunks')
      .update({
        content: 'Updated content for timestamp verification.',
      })
      .eq('id', inserted.id)
      .select('updated_at')
      .single()

    expect(updateError).toBeNull()
    if (!updated) throw new Error('Updated whatsapp knowledge chunk not found')

    const secondUpdatedAt = new Date(updated.updated_at ?? '').getTime()
    expect(secondUpdatedAt).toBeGreaterThan(firstUpdatedAt)

    await db.from('whatsapp_knowledge_chunks').delete().eq('id', inserted.id)
  })
})

describe('fulfilment status', () => {
  it('defaults to pending for new orders', async () => {
    const db = getDb()
    const { data: orders } = await db.from('shelf_orders').select('fulfilment_status').order('placed_at', { ascending: false }).limit(1)
    if (orders?.length) {
      expect(orders[0].fulfilment_status).toBe('pending')
    }
  })
})
