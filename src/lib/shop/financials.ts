export type ShopMoney = {
  subtotalPaise: number;
  couponDiscountPaise: number;
  offerDiscountPaise: number;
  discountPaise: number;
  shippingPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  taxPaise: number;
  totalPaise: number;
};

export function toPaise(value: number): number {
  const paise = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(paise)) {
    throw new Error("Invalid monetary amount.");
  }
  return paise;
}

export function assertPaise(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid monetary amount.");
  return value;
}

export function promotionDiscountPaise(base: number, promotion: {
  discountType: string | null; discountValue: number; maxDiscount: number | null;
} | null): number {
  assertPaise(base);
  if (!promotion || promotion.discountType === "free_shipping") return 0;
  const value = promotion.discountValue;
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid promotion amount.");
  let amount: number;
  if (promotion.discountType === "percentage" || promotion.discountType === "percent") {
    amount = Math.round(base * value / 100);
    if (promotion.maxDiscount != null && promotion.maxDiscount > 0) {
      amount = Math.min(amount, toPaise(promotion.maxDiscount));
    }
  } else if (promotion.discountType === "fixed_amount" || promotion.discountType === "flat") {
    amount = toPaise(value);
  } else {
    throw new Error("This promotion type is not supported by the shop.");
  }
  return assertPaise(Math.min(base, amount));
}

export function calculateShopMoney(input: {
  subtotalPaise: number; couponDiscountPaise: number; offerDiscountPaise: number;
  shippingPaise: number; cgstPercent: number; sgstPercent: number;
}): ShopMoney {
  const { subtotalPaise, couponDiscountPaise, offerDiscountPaise, shippingPaise } = input;
  [subtotalPaise, couponDiscountPaise, offerDiscountPaise, shippingPaise].forEach(assertPaise);
  const discountPaise = couponDiscountPaise + offerDiscountPaise;
  if (discountPaise > subtotalPaise) throw new Error("Discount exceeds merchandise total.");
  for (const rate of [input.cgstPercent, input.sgstPercent]) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error("Invalid GST rate.");
  }
  const taxable = subtotalPaise - discountPaise;
  const cgstPaise = Math.round(taxable * input.cgstPercent / 100);
  const sgstPaise = Math.round(taxable * input.sgstPercent / 100);
  const taxPaise = cgstPaise + sgstPaise;
  const totalPaise = assertPaise(taxable + shippingPaise + taxPaise);
  return { subtotalPaise, couponDiscountPaise, offerDiscountPaise, discountPaise, shippingPaise, cgstPaise, sgstPaise, taxPaise, totalPaise };
}

export function formatPaise(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(value / 100);
}

/** Only a reconciled, versioned order may start a new payment. Never reprice it here. */
export function readOrderMoney(order: Record<string, unknown>): ShopMoney {
  const snapshot = order.order_price_snapshot as { version?: number; currency?: string; money?: ShopMoney } | undefined;
  const money = snapshot?.money;
  if (snapshot?.version !== 2 || snapshot.currency !== "INR" || !money) {
    throw new Error("This order needs a pricing review. Please return to checkout before paying.");
  }
  for (const field of ["subtotalPaise", "couponDiscountPaise", "offerDiscountPaise", "discountPaise", "shippingPaise", "cgstPaise", "sgstPaise", "taxPaise", "totalPaise"] as const) {
    assertPaise(money[field]);
  }
  if (money.discountPaise !== money.couponDiscountPaise + money.offerDiscountPaise ||
      money.taxPaise !== money.cgstPaise + money.sgstPaise ||
      money.discountPaise > money.subtotalPaise ||
      money.totalPaise !== money.subtotalPaise - money.discountPaise + money.shippingPaise + money.taxPaise) {
    throw new Error("Order pricing mismatch. Payment is blocked pending review.");
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error("Order items need a pricing review before payment.");
  }
  const itemSubtotal = order.items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
    if (!item || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid order item quantity. Payment is blocked pending review.");
    }
    return assertPaise(sum + toPaise(Number(item.unitPrice)) * item.quantity);
  }, 0);
  if (itemSubtotal !== money.subtotalPaise) {
    throw new Error("Order item pricing mismatch. Payment is blocked pending review.");
  }
  for (const [field, amount] of [["subtotal", money.subtotalPaise], ["discount_amount", money.discountPaise], ["shipping_charge", money.shippingPaise], ["total_amount", money.totalPaise]] as const) {
    if (order[field] == null || toPaise(Number(order[field])) !== amount || Number(order[`${field}_paise`]) !== amount) {
      throw new Error("Order pricing mismatch. Payment is blocked pending review.");
    }
  }
  if (Number(order.payment_amount_paise) !== money.totalPaise || order.payment_currency !== "INR") {
    throw new Error("Order payment amount mismatch. Payment is blocked pending review.");
  }
  return money;
}

/** Preserve the original money breakdown when creating/retrying gateway attempts. */
export function buildShopPaymentPricingSnapshot(order: Record<string, unknown>): Record<string, unknown> {
  const money = readOrderMoney(order);
  return {
    ...(order.order_price_snapshot as Record<string, unknown>),
    money,
    subtotal: money.subtotalPaise / 100,
    discount_amount: money.discountPaise / 100,
    shipping_charge: money.shippingPaise / 100,
    total_amount: money.totalPaise / 100,
    order_items: order.items,
    shipping_address: order.shipping_address,
  };
}
