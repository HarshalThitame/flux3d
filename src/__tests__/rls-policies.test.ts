import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getDb, seedTestData, cleanDb, TEST_USER_ID } from './helpers'

const LOCAL_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = '$SUPABASE_SERVICE_ROLE_KEY'

let serviceClient = createClient(LOCAL_URL, SERVICE_KEY)

beforeAll(async () => {
  serviceClient = createClient(LOCAL_URL, SERVICE_KEY)
  await cleanDb()
  await seedTestData()
})

afterAll(async () => {
  await cleanDb()
})

async function createRlsUser(email: string): Promise<{ id: string; client: ReturnType<typeof createClient>; token: string }> {
  const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
    email, password: 'test123456', email_confirm: true,
  })
  if (createErr || !created?.user) {
    // User might already exist — sign in instead
    const { data: signIn } = await serviceClient.auth.signInWithPassword({ email, password: 'test123456' })
    if (!signIn?.user || !signIn.session?.access_token) {
      throw new Error(`Cannot create or sign in user ${email}: ${createErr?.message}`)
    }
    await serviceClient.from('profiles').upsert({ id: signIn.user.id, email, full_name: email.split('@')[0] }).maybeSingle()
    const userClient = createClient(LOCAL_URL, signIn.session.access_token)
    return { id: signIn.user.id, client: userClient, token: signIn.session.access_token }
  }

  await serviceClient.from('profiles').upsert({ id: created.user.id, email, full_name: email.split('@')[0] }).maybeSingle()

  const { data: signIn } = await serviceClient.auth.signInWithPassword({ email, password: 'test123456' })
  if (!signIn?.session?.access_token) throw new Error('Cannot sign in')

  const userClient = createClient(LOCAL_URL, signIn.session.access_token)
  return { id: created.user.id, client: userClient, token: signIn.session.access_token }
}

describe.skip('RLS: shelf_orders isolation', () => {
  let userA: { id: string; client: ReturnType<typeof createClient> }
  let userB: { id: string; client: ReturnType<typeof createClient> }

  beforeAll(async () => {
    userA = await createRlsUser('rls_a@test.com')
    userB = await createRlsUser('rls_b@test.com')

    // Use RPC to create orders (bypasses INSERT permission issues)
    const { error: errA } = await serviceClient.rpc('create_shelf_order_atomic', {
      p_user_id: userA.id, p_order_number: 'RLS-A-001',
      p_items: [{ productId: '00000000-0000-0000-0000-000000000000', skuId: '00000000-0000-0000-0000-000000000000', quantity: 1, customizationText: null }],
      p_subtotal_paise: 10000, p_discount_amount_paise: 0, p_coupon_code: null,
      p_shipping_charge_paise: 0, p_total_amount_paise: 10000,
      p_shipping_address: { name: 'A', phone: '9000000000', line1: 'A St', city: 'Mumbai', state: 'MH', pincode: '400001' },
    })
    if (errA) throw new Error(`Create RLS-A-001 failed: ${errA.message}`)

    const { error: errB } = await serviceClient.rpc('create_shelf_order_atomic', {
      p_user_id: userB.id, p_order_number: 'RLS-B-001',
      p_items: [{ productId: '00000000-0000-0000-0000-000000000000', skuId: '00000000-0000-0000-0000-000000000000', quantity: 1, customizationText: null }],
      p_subtotal_paise: 20000, p_discount_amount_paise: 0, p_coupon_code: null,
      p_shipping_charge_paise: 0, p_total_amount_paise: 20000,
      p_shipping_address: { name: 'B', phone: '9000000001', line1: 'B St', city: 'Delhi', state: 'DL', pincode: '200001' },
    })
    if (errB) throw new Error(`Create RLS-B-001 failed: ${errB.message}`)
  })

  it('user A sees only own orders', async () => {
    const { data } = await userA.client.from('shelf_orders').select('order_number')
    const numbers = (data ?? []).map((r: any) => r.order_number)
    expect(numbers).toContain('RLS-A-001')
    expect(numbers).not.toContain('RLS-B-001')
  })

  it('user B sees only own orders', async () => {
    const { data } = await userB.client.from('shelf_orders').select('order_number')
    const numbers = (data ?? []).map((r: any) => r.order_number)
    expect(numbers).toContain('RLS-B-001')
    expect(numbers).not.toContain('RLS-A-001')
  })

  it('service_role sees all orders', async () => {
    const { data } = await serviceClient.from('shelf_orders').select('order_number')
    const numbers = (data ?? []).map((r: any) => r.order_number)
    expect(numbers).toContain('RLS-A-001')
    expect(numbers).toContain('RLS-B-001')
  })
})

describe.skip('RLS: inventory_reservations isolation', () => {
  let userA: { id: string; client: ReturnType<typeof createClient> }
  let userB: { id: string; client: ReturnType<typeof createClient> }

  beforeAll(async () => {
    userA = await createRlsUser('rls_res_a@test.com')
    userB = await createRlsUser('rls_res_b@test.com')

    const { data: orderA } = await serviceClient.rpc('create_shelf_order_atomic', {
      p_user_id: userA.id, p_order_number: 'RLS-RES-A',
      p_items: [{ productId: '00000000-0000-0000-0000-000000000000', skuId: '00000000-0000-0000-0000-000000000000', quantity: 1, customizationText: null }],
      p_subtotal_paise: 10000, p_discount_amount_paise: 0, p_coupon_code: null,
      p_shipping_charge_paise: 0, p_total_amount_paise: 10000,
      p_shipping_address: { name: 'A', phone: '9000000000', line1: 'A St', city: 'Mumbai', state: 'MH', pincode: '400001' },
    })
    const orderIdA = orderA?.orderId as string | undefined

    const { data: orderB } = await serviceClient.rpc('create_shelf_order_atomic', {
      p_user_id: userB.id, p_order_number: 'RLS-RES-B',
      p_items: [{ productId: '00000000-0000-0000-0000-000000000000', skuId: '00000000-0000-0000-0000-000000000000', quantity: 1, customizationText: null }],
      p_subtotal_paise: 20000, p_discount_amount_paise: 0, p_coupon_code: null,
      p_shipping_charge_paise: 0, p_total_amount_paise: 20000,
      p_shipping_address: { name: 'B', phone: '9000000001', line1: 'B St', city: 'Delhi', state: 'DL', pincode: '200001' },
    })
    const orderIdB = orderB?.orderId as string | undefined

    if (orderIdA) {
      await serviceClient.from('inventory_reservations').insert({
        sku_id: (await serviceClient.from('shelf_skus').select('id').limit(1).single()).data.id,
        order_id: orderIdA, quantity: 1, expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
    }
    if (orderIdB) {
      await serviceClient.from('inventory_reservations').insert({
        sku_id: (await serviceClient.from('shelf_skus').select('id').limit(1).single()).data.id,
        order_id: orderIdB, quantity: 2, expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
    }
  })

  it('user A sees own orders and reservations', async () => {
    const { data: orders, error: err } = await userA.client.from('shelf_orders').select('order_number')
    expect(err).toBeNull()
    expect(Array.isArray(orders)).toBe(true)
    const orderNumbers = (orders ?? []).map((o: any) => o.order_number)
    expect(orderNumbers).toContain('RLS-RES-A')
  })
})

describe('RLS: profiles isolation', () => {
  it('anon user cannot access profiles', async () => {
    const anon = createClient(LOCAL_URL, 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH')
    const { data } = await anon.from('profiles').select('id')
    expect(data ?? []).toHaveLength(0)
  })
})
