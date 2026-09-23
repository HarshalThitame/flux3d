import { roundMoney } from "@/lib/shop/pricing";

export type CartPriceRule = {
  id: string;
  product_id: string;
  name: string;
  adjustment_type: "percentage" | "fixed_amount";
  direction: "increase" | "decrease";
  adjustment_value: number;
  min_unit_price: number;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type CartPriceAdjustment = {
  ruleId: string;
  ruleName: string;
  baseUnitPrice: number;
  adjustedUnitPrice: number;
  amount: number;
  adjustmentType: CartPriceRule["adjustment_type"];
  direction: CartPriceRule["direction"];
};

export function isCartPriceRuleActive(rule: CartPriceRule, now = new Date()) {
  if (!rule.is_active) return false;
  const timestamp = now.getTime();
  if (rule.starts_at && new Date(rule.starts_at).getTime() > timestamp)
    return false;
  if (rule.ends_at && new Date(rule.ends_at).getTime() <= timestamp)
    return false;
  return true;
}

export function selectCartPriceRule(rules: CartPriceRule[], now = new Date()) {
  return (
    rules
      .filter((rule) => isCartPriceRuleActive(rule, now))
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          new Date(right.starts_at ?? 0).getTime() -
            new Date(left.starts_at ?? 0).getTime(),
      )[0] ?? null
  );
}

export function resolveCartUnitPrice(
  baseUnitPrice: number,
  rule: CartPriceRule | null,
): CartPriceAdjustment | null {
  if (!rule || !Number.isFinite(baseUnitPrice)) return null;
  const base = roundMoney(Math.max(0, baseUnitPrice));
  const rawAmount =
    rule.adjustment_type === "percentage"
      ? (base * Number(rule.adjustment_value)) / 100
      : Number(rule.adjustment_value);
  const signedAmount = rule.direction === "decrease" ? -rawAmount : rawAmount;
  const adjusted = roundMoney(
    Math.max(Number(rule.min_unit_price ?? 0), base + signedAmount),
  );
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    baseUnitPrice: base,
    adjustedUnitPrice: adjusted,
    amount: roundMoney(adjusted - base),
    adjustmentType: rule.adjustment_type,
    direction: rule.direction,
  };
}

export function groupRulesByProduct(rules: CartPriceRule[], now = new Date()) {
  const grouped = new Map<string, CartPriceRule[]>();
  for (const rule of rules) {
    if (!isCartPriceRuleActive(rule, now)) continue;
    const productRules = grouped.get(rule.product_id) ?? [];
    productRules.push(rule);
    grouped.set(rule.product_id, productRules);
  }
  return new Map(
    [...grouped.entries()].map(([productId, productRules]) => [
      productId,
      selectCartPriceRule(productRules, now),
    ]),
  );
}
