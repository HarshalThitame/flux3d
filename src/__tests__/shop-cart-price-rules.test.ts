import { describe, expect, it } from "vitest";
import {
  isCartPriceRuleActive,
  resolveCartUnitPrice,
  selectCartPriceRule,
  type CartPriceRule,
} from "@/lib/shop/cart-price-rules";

const now = new Date("2026-09-24T12:00:00.000Z");
const rule = (overrides: Partial<CartPriceRule> = {}): CartPriceRule => ({
  id: "rule-1",
  product_id: "product-1",
  name: "Autumn sale",
  adjustment_type: "percentage",
  direction: "decrease",
  adjustment_value: 20,
  min_unit_price: 0,
  priority: 10,
  starts_at: null,
  ends_at: null,
  is_active: true,
  ...overrides,
});

describe("cart price rules", () => {
  it("resolves percentage and fixed changes per SKU unit", () => {
    expect(resolveCartUnitPrice(1000, rule())?.adjustedUnitPrice).toBe(800);
    expect(
      resolveCartUnitPrice(
        1000,
        rule({
          adjustment_type: "fixed_amount",
          adjustment_value: 125,
          direction: "increase",
        }),
      )?.adjustedUnitPrice,
    ).toBe(1125);
  });

  it("enforces the configured minimum final unit price", () => {
    const result = resolveCartUnitPrice(
      100,
      rule({
        adjustment_type: "fixed_amount",
        adjustment_value: 200,
        min_unit_price: 25,
      }),
    );
    expect(result?.adjustedUnitPrice).toBe(25);
    expect(result?.amount).toBe(-75);
  });

  it("evaluates schedules and deterministically selects highest priority", () => {
    expect(
      isCartPriceRuleActive(
        rule({ starts_at: "2026-09-25T00:00:00.000Z" }),
        now,
      ),
    ).toBe(false);
    expect(
      isCartPriceRuleActive(rule({ ends_at: "2026-09-24T12:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      selectCartPriceRule(
        [rule({ id: "low", priority: 1 }), rule({ id: "high", priority: 20 })],
        now,
      )?.id,
    ).toBe("high");
  });
});
