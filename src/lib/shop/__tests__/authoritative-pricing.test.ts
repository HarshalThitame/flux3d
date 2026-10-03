import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusinessSettings } from '@/lib/admin/business-settings';

const fixture = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  settings: {} as BusinessSettings,
  failures: {} as Record<string, string>,
  calls: {} as Record<string, number>,
}));

function query(table: string) {
  fixture.calls[table] = (fixture.calls[table] ?? 0) + 1;
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];
  let single = false;
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: (field: string, value: unknown) => { filters.push(row => row[field] === value); return builder; },
    in: (field: string, values: unknown[]) => { filters.push(row => values.includes(row[field])); return builder; },
    maybeSingle: () => { single = true; return builder; },
    then: (resolve: (result: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      const rows = (fixture.tables[table] ?? []).filter(row => filters.every(filter => filter(row)));
      return Promise.resolve({ data: single ? rows[0] ?? null : rows, count: rows.length,
        error: fixture.failures[table] ? { message: fixture.failures[table] } : null }).then(resolve, reject);
    },
  };
  return builder;
}

vi.mock('@/lib/admin/server', () => ({ createAdminSupabaseClient: () => ({ from: query }) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: query }) }));
vi.mock('@/lib/settings', () => ({ getCheckoutSettings: async () => fixture.settings }));

import { quoteShopOrder } from '../authoritative-pricing';

const input = { items: [{ productId: 'product', skuId: 'sku', quantity: 1 }],
  destination: { pincode: '411001', state: 'Maharashtra' } };

beforeEach(() => {
  fixture.failures = {};
  fixture.calls = {};
  fixture.settings = { deliveryChargeThreshold: 500, defaultDeliveryCharge: 50,
    shopMinimumOrderValue: 0, gstEnabled: false, cgstPercent: 9, sgstPercent: 9 } as BusinessSettings;
  fixture.tables = {
    shelf_skus: [{ id: 'sku', product_id: 'product', sku_code: 'SKU', price: 400,
      stock_quantity: 5, is_available: true, weight_grams: 100, variant_combination: { material: 'PLA' } }],
    shelf_products: [{ id: 'product', name: 'Product', slug: 'product', is_active: true, is_archived: false }],
    shelf_product_cart_price_rules: [], shipping_rules: [], shelf_coupons: [], coupons: [], offers: [],
    redemptions: [], shop_promotion_reservations: [],
  };
});

function coupon(value = 100) {
  fixture.tables.shelf_coupons = [{ id: 'coupon', code: 'SAVE', is_active: true,
    discount_type: 'flat', discount_value: value, valid_from: '2020-01-01', valid_until: '2099-12-31', max_uses: 10, used_count: 0 }];
}

function offer() {
  fixture.tables.offers = [{ id: 'offer', is_active: true, offer_type: 'percentage',
    discount_value: 10, starts_at: '2020-01-01T00:00:00.000Z', ends_at: '2099-12-31T00:00:00.000Z', used_count: 0 }];
}

describe('authoritative shop quotes', () => {
  it('includes the admin delivery charge below the threshold', async () => {
    const quote = await quoteShopOrder(input);
    expect(quote.snapshot.money.shippingPaise).toBe(5000);
    expect(quote.snapshot.money.totalPaise).toBe(45000);
    expect(quote.estimated).toBe(false);
  });

  it('applies the threshold after coupon discounts', async () => {
    fixture.tables.shelf_skus[0].price = 550;
    coupon();
    const quote = await quoteShopOrder({ ...input, couponCode: 'SAVE' });
    expect(quote.snapshot.money.shippingPaise).toBe(5000);
    expect(quote.snapshot.money.totalPaise).toBe(50000);
    expect(quote.snapshot.delivery_source).toBe('default');
  });

  it('uses the matching regional fee when a discount drops the cart below free delivery', async () => {
    fixture.tables.shelf_skus[0].price = 550;
    fixture.tables.shipping_rules = [{ id: 'pune', is_active: true, state: 'Maharashtra',
      pincode_range_start: '411000', pincode_range_end: '411999', charge: 75, restricted: false }];
    coupon();
    const quote = await quoteShopOrder({ ...input, couponCode: 'SAVE' });
    expect(quote.snapshot.money).toMatchObject({ subtotalPaise: 55000, couponDiscountPaise: 10000,
      shippingPaise: 7500, totalPaise: 52500 });
    expect(quote.snapshot.delivery_source).toBe('regional_rule');
    expect(quote.snapshot.delivery_rule_id).toBe('pune');
  });

  it('applies the exact selected offer after the coupon, without dropping either discount', async () => {
    fixture.tables.shelf_skus[0].price = 1000;
    coupon(); offer();
    const quote = await quoteShopOrder({ ...input, couponCode: 'SAVE', appliedOfferId: 'offer' });
    expect(quote.offerId).toBe('offer');
    expect(quote.snapshot.money).toMatchObject({ couponDiscountPaise: 10000, offerDiscountPaise: 9000,
      shippingPaise: 0, totalPaise: 81000 });
    expect(quote.snapshot.promotions.map(p => p.table)).toEqual(['shelf_coupons', 'offers']);
  });

  it('does not re-query every automatic offer while calculating delivery', async () => {
    fixture.tables.offers = [
      { id: 'expired', is_active: true, offer_type: 'percentage', discount_value: 10, starts_at: '2020-01-01T00:00:00.000Z', ends_at: '2021-01-01T00:00:00.000Z' },
      { id: 'current', is_active: true, offer_type: 'percentage', discount_value: 10, starts_at: '2020-01-01T00:00:00.000Z', ends_at: '2099-12-31T00:00:00.000Z' },
    ];
    const quote = await quoteShopOrder(input);
    expect(quote.offerId).toBe('current');
    expect(fixture.calls.offers).toBe(1);
  });

  it('includes configured GST in the exact displayed and payable total', async () => {
    fixture.settings.gstEnabled = true;
    const quote = await quoteShopOrder(input);
    expect(quote.snapshot.money).toMatchObject({ cgstPaise: 3600, sgstPaise: 3600,
      shippingPaise: 5000, totalPaise: 52200 });
  });

  it('preserves regional charges and restricted delivery destinations', async () => {
    fixture.tables.shipping_rules = [{ id: 'regional', is_active: true, state: 'Maharashtra',
      pincode_range_start: '411000', pincode_range_end: '411999', charge: 75, restricted: false }];
    expect((await quoteShopOrder(input)).snapshot.money.totalPaise).toBe(47500);
    fixture.tables.shipping_rules[0].restricted = true;
    await expect(quoteShopOrder(input)).rejects.toThrow(/do not deliver/);
  });

  it('keeps delivery free for a free-shipping coupon and still charges GST', async () => {
    fixture.settings.gstEnabled = true;
    coupon(); fixture.tables.shelf_coupons[0].discount_type = 'free_shipping';
    const quote = await quoteShopOrder({ ...input, couponCode: 'SAVE' });
    expect(quote.snapshot.money).toMatchObject({ shippingPaise: 0, totalPaise: 47200 });
  });

  it('prices current SKU charges and marks a destination-free quote as estimated', async () => {
    fixture.tables.shelf_skus[0].price = 401.25;
    const quote = await quoteShopOrder({ ...input, destination: null });
    expect(quote.snapshot.money.totalPaise).toBe(45125);
    expect(quote.estimated).toBe(true);
    fixture.tables.shelf_skus[0].price = 402;
    expect((await quoteShopOrder(input)).fingerprint).not.toBe(quote.fingerprint);
  });

  it('counts combined quantities for the same SKU before accepting stock', async () => {
    await expect(quoteShopOrder({ ...input, items: [
      { ...input.items[0], quantity: 3, customizationText: 'A' },
      { ...input.items[0], quantity: 3, customizationText: 'B' },
    ] })).rejects.toThrow(/requested quantity/);
  });

  it('does not silently substitute a delivery charge when shipping rules cannot be read', async () => {
    fixture.failures.shipping_rules = 'Database unavailable';
    await expect(quoteShopOrder(input)).rejects.toThrow(/verify delivery charges/);
  });

  it('does not count a cancelled versioned order against a promotion per-user limit', async () => {
    offer(); fixture.tables.offers[0].usage_per_user = 1;
    fixture.tables.redemptions = [{ order_id: 'old-order', user_id: 'user', offer_id: 'offer' }];
    fixture.tables.shop_promotion_reservations = [{ order_id: 'old-order', user_id: 'user',
      source_table: 'offers', promotion_id: 'offer', released_at: '2026-01-01T00:00:00Z' }];
    expect((await quoteShopOrder({ ...input, userId: 'user' })).offerId).toBe('offer');
  });
});
