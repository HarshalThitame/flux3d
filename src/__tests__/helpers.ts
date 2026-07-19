import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { LOCAL_SUPABASE_URL as LOCAL_URL, LOCAL_SERVICE_KEY } from './env'

let supabase: SupabaseClient | null = null

export function getDb(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(LOCAL_URL, LOCAL_SERVICE_KEY)
  }
  return supabase
}

export async function cleanDb() {
  const db = getDb()
  const tables = [
    'inventory_reservations', 'payment_attempts', 'payment_events', 'payment_refunds',
    'payment_audit_logs', 'payment_status_history', 'whatsapp_webhook_events',
    'shelf_orders', 'shelf_skus', 'shelf_products', 'shelf_coupons', 'shelf_categories',
    'shipping_rules', 'business_settings', 'orders', 'redemptions', 'addresses', 'quotes',
  ]
  for (const t of tables) {
    try { await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000') } catch { /* empty */ }
  }
}

export let TEST_USER_ID: string

export async function seedTestData() {
  const db = getDb()

  const { data: existing } = await db.from('shelf_skus').select('sku_code').eq('sku_code', 'TP-RED').limit(1)
  if (existing?.length) {
    // Ensure TEST_USER_ID is set even when data already exists
    const { data: existingUser } = await db.from('auth.users').select('id').limit(1)
    if (existingUser?.length) TEST_USER_ID = existingUser[0].id
    return
  }

  await cleanDb()

  // Create a test auth user
  const { data: userData, error: userErr } = await db.auth.admin.createUser({
    email: `test_${Date.now()}@test.com`, password: 'test123456', email_confirm: true,
  })
  if (userErr || !userData?.user) throw new Error(`Failed to create user: ${userErr?.message}`)
  TEST_USER_ID = userData.user.id

  await db.from('profiles').upsert({ id: TEST_USER_ID, email: 'testseed@test.com', full_name: 'Test User' })

  await db.from('shipping_rules').insert({
    state: 'maharashtra', pincode_range_start: '400001', pincode_range_end: '400099',
    minimum_order_value: 0, charge: 50, charge_paise: 5000, is_active: true,
  })

  await db.from('business_settings').insert({
    overhead_percent: 15, margin_percentage: 30, material_markup_percent: 15,
    print_speed_grams_per_hour: 14.5, delivery_charge_threshold: 499, default_delivery_charge: 50,
    gst_enabled: true, cgst_percent: 9, sgst_percent: 9,
    business_name: 'Test Business',
  })

  await db.from('shelf_categories').insert({ name: 'Test', slug: 'test' })

  const { data: cat } = await db.from('shelf_categories').select('id').eq('slug', 'test').limit(1).maybeSingle()

  const { data: product, error: pErr } = await db.from('shelf_products').insert({
    name: 'Test Product', slug: 'test-product', description: 'Test item',
    base_price: 1000, is_active: true,
    category_id: cat?.id ?? null,
  }).select('id').single()

  if (pErr) throw new Error(`Failed to create product: ${pErr.message}`)

  const { error: skuErr } = await db.from('shelf_skus').insert([
    { product_id: product.id, sku_code: 'TP-RED', price: 500, stock_quantity: 10, weight_grams: 200, is_available: true, variant_combination: { color: 'Red' } },
    { product_id: product.id, sku_code: 'TP-BLUE', price: 600, stock_quantity: 0, weight_grams: 200, is_available: false, variant_combination: { color: 'Blue' } },
  ])
  if (skuErr) throw new Error(`Failed to create SKUs: ${skuErr.message}`)

  await db.from('shelf_coupons').upsert({
    code: 'TEST10', discount_type: 'percent', discount_value: 10,
    min_order_value: 100, max_uses: 100, is_active: true,
    valid_from: '2026-01-01', valid_until: '2027-12-31',
  }, { onConflict: 'code' })

  const { data: verify } = await db.from('shelf_skus').select('sku_code').eq('sku_code', 'TP-RED')
  if (!verify?.length) throw new Error('Seed verification failed: TP-RED not found')
}
