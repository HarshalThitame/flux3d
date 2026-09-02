import type {
  PricingRuleType,
  ShopSkuPricingRule,
  SkuPatternOption,
  SkuStatus,
  VariantValueMetadata,
} from "@/lib/shop/admin-types";

// ============================================================================
// AETHER SKU Engine
// Core utilities for pattern-based SKU codes, enterprise pricing rules,
// status derivation, margin and tiered pricing.
// ============================================================================

export const SKU_TIERS = ["Member", "VIP", "Wholesale"] as const;

const SIZE_MAP: Record<string, string> = {
  "extra small": "XS",
  "x-small": "XS",
  small: "S",
  medium: "M",
  large: "L",
  "x-large": "XL",
  "extra large": "XL",
  xxl: "XXL",
  xxxl: "XXXL",
  "double extra large": "XXL",
  "triple extra large": "XXXL",
  "one size": "OS",
};

function normalizeTokenName(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function abbreviateVariantValue(
  value: string,
  metadata?: VariantValueMetadata | null,
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (metadata?.slug) return metadata.slug.toUpperCase();

  const lower = trimmed.toLowerCase();

  if (lower in SIZE_MAP) return SIZE_MAP[lower];

  const words = trimmed
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return "";
  if (words.length === 1) {
    const word = words[0];
    if (word.length <= 4) return word.toUpperCase();
    return word.slice(0, 3).toUpperCase();
  }

  const compact = words
    .slice(0, 3)
    .map((word) => word.slice(0, 3).toUpperCase())
    .join("-");
  return compact;
}

function getValueForToken(
  token: string,
  combo: Record<string, string | boolean>,
  options: { name: string; metadata?: Record<string, VariantValueMetadata> }[],
): { value: string; metadata?: VariantValueMetadata | null } | null {
  const normalizedToken = normalizeTokenName(token);
  for (const option of options) {
    if (normalizeTokenName(option.name) !== normalizedToken) continue;
    const raw = combo[option.name];
    if (typeof raw !== "string" || !raw) return null;
    const metadata = option.metadata?.[raw] ?? null;
    return { value: raw, metadata };
  }
  return null;
}

function initialsOf(name: string) {
  const words = name
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export type { SkuPatternOption } from "@/lib/shop/admin-types";

/**
 * Resolve a SKU pattern template against a variant combination.
 * Tokens like {SLUG}, {COLOR}, {MATERIAL}, {SIZE} map onto option values.
 * {INITIALS} uses the product name. Unresolvable tokens are dropped and
 * surrounding separators are collapsed.
 */
export function resolveSkuPattern(
  pattern: string,
  productSlug: string,
  productName: string,
  combo: Record<string, string | boolean>,
  options: SkuPatternOption[],
): string {
  if (!pattern || !pattern.includes("{")) return "";
  const tokenPattern = /\{([A-Z0-9-]+)\}/gi;
  let resolved = pattern.replace(tokenPattern, (_match, token: string) => {
    const key = token.toUpperCase();
    if (key === "SLUG") {
      return slugifySku(productSlug);
    }
    if (key === "INITIALS") {
      return initialsOf(productName);
    }
    const found = getValueForToken(token, combo, options);
    if (!found) return "";
    return abbreviateVariantValue(found.value, found.metadata);
  });
  resolved = resolved.replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return resolved;
}

export function slugifySku(slug: string) {
  return slug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a guaranteed-unique SKU code for a combination using the pattern.
 * Falls back to a monotonic suffix when duplicates are detected.
 */
export function buildSkuCode(
  pattern: string,
  productSlug: string,
  productName: string,
  combo: Record<string, string | boolean>,
  options: SkuPatternOption[],
  existingCodes: Set<string>,
  index: number,
): string {
  const base = resolveSkuPattern(
    pattern,
    productSlug,
    productName,
    combo,
    options,
  );
  if (!base) {
    return `${slugifySku(productSlug)}-${(index + 1).toString().padStart(3, "0")}`;
  }
  let code = base;
  let suffix = 2;
  while (existingCodes.has(code)) {
    code = `${base}-${suffix}`;
    suffix += 1;
  }
  existingCodes.add(code);
  return code;
}

// ============================================================================
// Pricing Rules — highest priority matching rule wins
// ============================================================================

function conditionsMatch(
  conditions: Record<string, string | string[] | boolean>,
  combo: Record<string, string | boolean>,
): boolean {
  const keys = Object.keys(conditions);
  if (keys.length === 0) return true;
  return keys.every((key) => {
    const expected = conditions[key];
    const actual = combo[key];
    if (Array.isArray(expected)) {
      return typeof actual === "string" && expected.includes(actual);
    }
    return actual === expected;
  });
}

export function applySkuPricingRules(
  basePrice: number,
  combo: Record<string, string | boolean>,
  rules: ShopSkuPricingRule[],
): number {
  const active = rules.filter((rule) => rule.is_active);
  if (active.length === 0 || !Number.isFinite(basePrice)) return basePrice;

  const matching = active.filter((rule) =>
    conditionsMatch(rule.conditions, combo),
  );
  if (matching.length === 0) return basePrice;

  const highest = matching.sort((a, b) => b.priority - a.priority)[0];
  return applyPricingRuleType(highest.rule_type, basePrice, highest.value);
}

export function applyPricingRuleType(
  ruleType: PricingRuleType,
  basePrice: number,
  value: number,
): number {
  switch (ruleType) {
    case "fixed_add":
      return basePrice + value;
    case "percent_add":
      return basePrice * (1 + value / 100);
    case "fixed_override":
      return value;
    case "multiply":
      return basePrice * value;
    default:
      return basePrice;
  }
}

export function pricingRuleLabel(ruleType: PricingRuleType, value: number) {
  switch (ruleType) {
    case "fixed_add":
      return `+₹${value}`;
    case "percent_add":
      return `+${value}%`;
    case "fixed_override":
      return `= ₹${value}`;
    case "multiply":
      return `× ${value}`;
    default:
      return String(value);
  }
}

// ============================================================================
// Status / margin / tiers
// ============================================================================

export function deriveSkuStatus(
  stock: number,
  threshold: number | null,
  isAvailable: boolean | null,
): SkuStatus {
  if (isAvailable == null) return "draft";
  if (isAvailable === false) return "unavailable";
  if (stock <= 0) return "out_of_stock";
  const th = threshold ?? 5;
  if (stock <= th) return "low_stock";
  return "active";
}

export function computeMarginPct(
  price: number,
  cost: number | null | undefined,
): number | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  if (cost == null || !Number.isFinite(cost)) return null;
  return ((price - cost) / price) * 100;
}

export function marginTone(
  margin: number | null,
): "negative" | "low" | "healthy" | "premium" {
  if (margin == null) return "low";
  if (margin < 10) return "negative";
  if (margin < 25) return "low";
  if (margin < 45) return "healthy";
  return "premium";
}

export function defaultTierPrice(
  tier: (typeof SKU_TIERS)[number],
  price: number,
) {
  if (!Number.isFinite(price)) return price;
  switch (tier) {
    case "Member":
      return roundPrice(price * 0.97);
    case "VIP":
      return roundPrice(price * 0.92);
    case "Wholesale":
      return roundPrice(price * 0.85);
    default:
      return price;
  }
}

export function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

export function isDiscreteOptionType(
  optionType: string,
): optionType is "button" | "swatch_color" | "dropdown" | "toggle" {
  return ["button", "swatch_color", "dropdown", "toggle"].includes(optionType);
}

export function deriveComboPriceModifier(
  metadata: Record<string, VariantValueMetadata> | null,
): number {
  if (!metadata) return 0;
  let total = 0;
  for (const value of Object.values(metadata)) {
    if (typeof value?.price_modifier === "number")
      total += value.price_modifier;
  }
  return total;
}

// ============================================================================
// Draft row builder (pure — used by generation preview + actual generation)
// ============================================================================

export type SkuGenerationInput = {
  product: {
    slug: string;
    name: string;
    base_price: number;
    sku_pattern?: string | null;
  };
  variants: SkuPatternOption[];
  rules: ShopSkuPricingRule[];
  defaultWeight?: number | string | null;
  defaultCost?: number | string | null;
  defaultCompareAt?: number | string | null;
  defaultIsAvailable?: boolean;
  existingCodes?: string[];
  stock_quantity?: number;
  low_stock_threshold?: number;
};

export type SkuDraftRow = {
  sku_code: string;
  variant_combination: Record<string, string | boolean>;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  weight_grams: number | null;
  is_available: boolean;
  cost_price: number | null;
  price_modifier: number;
};

/**
 * Build SKU draft rows for every cartesian combination of the discrete
 * options, applying the SKU pattern and the highest-priority pricing rule.
 */
export function buildSkuRows(input: SkuGenerationInput): SkuDraftRow[] {
  const {
    product,
    variants,
    rules,
    defaultWeight,
    defaultCost,
    defaultCompareAt,
    defaultIsAvailable = true,
    existingCodes = [],
    stock_quantity = 0,
    low_stock_threshold = 5,
  } = input;

  const discrete = variants.filter((variant) =>
    variant.type ? isDiscreteOptionType(variant.type) : true,
  );

  const combos = cartesian(discrete);
  const usedCodes = new Set(existingCodes.filter(Boolean));

  return combos.map((combo, index) => {
    const priceModifier = variants.reduce((total, option) => {
      const raw = combo[option.name];
      if (typeof raw !== "string") return total;
      return total + (option.metadata?.[raw]?.price_modifier ?? 0);
    }, 0);

    const price = roundPrice(
      applySkuPricingRules(product.base_price + priceModifier, combo, rules),
    );
    const weight =
      defaultWeight !== undefined &&
      defaultWeight !== null &&
      defaultWeight !== ""
        ? Number(defaultWeight) || null
        : null;
    const cost =
      defaultCost !== undefined && defaultCost !== null && defaultCost !== ""
        ? Number(defaultCost) || null
        : null;
    const compareAt =
      defaultCompareAt !== undefined &&
      defaultCompareAt !== null &&
      defaultCompareAt !== ""
        ? Number(defaultCompareAt) || null
        : null;

    return {
      sku_code: buildSkuCode(
        product.sku_pattern || "{SLUG}-{COLOR}-{SIZE}",
        product.slug,
        product.name,
        combo,
        variants,
        usedCodes,
        index,
      ),
      variant_combination: combo,
      price,
      compare_at_price: compareAt,
      stock_quantity,
      low_stock_threshold,
      weight_grams: weight,
      is_available: defaultIsAvailable !== false,
      cost_price: cost,
      price_modifier: priceModifier,
    };
  });
}

function cartesian(
  options: { name: string; values: string[] }[],
): Record<string, string>[] {
  if (options.length === 0) return [{}];
  return options.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((combo) =>
        (option.values ?? [])
          .filter(Boolean)
          .map((value) => ({ ...combo, [option.name]: value })),
      ),
    [{}],
  );
}
