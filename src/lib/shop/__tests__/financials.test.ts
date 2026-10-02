import { describe, expect, it } from "vitest";
import { calculateShopMoney, formatPaise, promotionDiscountPaise, readOrderMoney, buildShopPaymentPricingSnapshot } from "../financials";
import { fallbackShippingCharge } from "../shipping";

describe("authoritative shop money", () => {
  it("applies coupon then offer and charges delivery below the threshold", () => {
    const subtotal = 100000;
    const coupon = promotionDiscountPaise(subtotal, {
      discountType: "fixed_amount", discountValue: 100, maxDiscount: null,
    });
    const offer = promotionDiscountPaise(subtotal - coupon, {
      discountType: "percentage", discountValue: 10, maxDiscount: null,
    });
    const money = calculateShopMoney({
      subtotalPaise: subtotal, couponDiscountPaise: coupon, offerDiscountPaise: offer,
      shippingPaise: 5000, cgstPercent: 0, sgstPercent: 0,
    });
    expect(coupon).toBe(10000);
    expect(offer).toBe(9000);
    expect(money.totalPaise).toBe(86000);
  });

  it("keeps every component in paise with GST included", () => {
    const money = calculateShopMoney({
      subtotalPaise: 40000, couponDiscountPaise: 0, offerDiscountPaise: 0,
      shippingPaise: 5000, cgstPercent: 9, sgstPercent: 9,
    });
    expect(money.cgstPaise).toBe(3600);
    expect(money.sgstPaise).toBe(3600);
    expect(money.totalPaise).toBe(52200);
    expect(formatPaise(money.totalPaise)).toMatch(/522/);
  });

  it("never allows a promotion to exceed the merchandise total", () => {
    expect(promotionDiscountPaise(5000, {
      discountType: "fixed_amount", discountValue: 100, maxDiscount: null,
    })).toBe(5000);
  });

  it("uses the discounted merchandise total for free-delivery eligibility", () => {
    const discountedSubtotal = 55000 - promotionDiscountPaise(55000, {
      discountType: "fixed_amount", discountValue: 100, maxDiscount: null,
    });
    expect(discountedSubtotal).toBe(45000);
    expect(fallbackShippingCharge(discountedSubtotal / 100, {
      deliveryChargeThreshold: 500,
      defaultDeliveryCharge: 50,
    })).toBe(5000);
  });
});

function savedOrder(): Record<string, unknown> {
  const money = calculateShopMoney({ subtotalPaise: 40000, couponDiscountPaise: 1000, offerDiscountPaise: 2000,
    shippingPaise: 5000, cgstPercent: 9, sgstPercent: 9 });
  return { order_price_snapshot: { version: 2, currency: 'INR', money, cgst_percent: 9, sgst_percent: 9, tax: money.taxPaise / 100 },
    subtotal: 400, subtotal_paise: 40000, discount_amount: 30, discount_amount_paise: 3000,
    shipping_charge: 50, shipping_charge_paise: 5000, total_amount: money.totalPaise / 100,
    total_amount_paise: money.totalPaise, payment_amount_paise: money.totalPaise, payment_currency: 'INR',
    items: [{ quantity: 1, unitPrice: 400 }], shipping_address: {} };
}

describe('saved shop payment amounts', () => {
  it('preserves delivery, both discounts and GST when a gateway session saves its snapshot', () => {
    const order = savedOrder();
    const original = readOrderMoney(order);
    const snapshot = buildShopPaymentPricingSnapshot(order);
    expect(snapshot.money).toEqual(original);
    expect(snapshot.tax).toBe(66.6);
    expect(snapshot.shipping_charge).toBe(50);
    expect(snapshot.discount_amount).toBe(30);
    expect(snapshot.total_amount).toBe(486.6);
    expect(readOrderMoney({ ...order, payment_snapshot: snapshot })).toEqual(original);
  });

  it.each(['subtotal_paise', 'discount_amount_paise', 'shipping_charge_paise', 'total_amount_paise', 'payment_amount_paise'])('blocks a changed %s column', field => {
    const order = savedOrder();
    order[field] = Number(order[field]) + 1;
    expect(() => readOrderMoney(order)).toThrow(/mismatch/);
  });

  it('blocks an order without the versioned snapshot', () => {
    expect(() => readOrderMoney({ ...savedOrder(), order_price_snapshot: {} })).toThrow(/pricing review/);
  });

  it('blocks incomplete or noninteger breakdowns', () => {
    for (const value of [undefined, -1, 0.5, Number.NaN]) {
      const order = savedOrder();
      const snapshot = order.order_price_snapshot as { money: { cgstPaise?: number } };
      snapshot.money.cgstPaise = value;
      expect(() => readOrderMoney(order)).toThrow();
    }
  });

  it('blocks a changed gateway currency', () => {
    expect(() => readOrderMoney({ ...savedOrder(), payment_currency: 'USD' })).toThrow(/mismatch/);
  });

  it('blocks changed item prices or quantities even when the order total columns still match', () => {
    expect(() => readOrderMoney({ ...savedOrder(), items: [{ quantity: 1, unitPrice: 350 }] })).toThrow(/item pricing mismatch/);
    expect(() => readOrderMoney({ ...savedOrder(), items: [{ quantity: 0.5, unitPrice: 400 }] })).toThrow(/quantity/);
  });
});
