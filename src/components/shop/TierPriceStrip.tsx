"use client";

import type { ShopSkuTierPrice } from "@/lib/shop/admin-types";
import { formatShopPrice } from "@/lib/shop/selection";

const TIER_STYLES: Record<string, string> = {
  Member:
    "border-[var(--shop-gold-faint)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]",
  VIP: "border-[#0F1B3D]/10 bg-[#0F1B3D] text-white",
  Wholesale: "border-gray-200 bg-white text-[var(--shop-text-subtle)]",
};

/**
 * Compact Member / VIP / Wholesale tier pricing strip for the selected SKU.
 * Rendered only when tier prices exist for the resolved combination.
 */
export function TierPriceStrip({
  tierPrices,
}: {
  tierPrices: ShopSkuTierPrice[];
}) {
  if (!tierPrices || tierPrices.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-[var(--shop-gold-faint)] bg-[var(--shop-bg-soft)] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--shop-gold)]">
          Enterprise Pricing
        </span>
        <span className="text-[10px] text-[var(--shop-text-muted)]">
          For registered members
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tierPrices.map((tier) => (
          <div
            key={tier.tier_name}
            className={`rounded-xl border px-2.5 py-2 text-center ${TIER_STYLES[tier.tier_name] ?? "border-gray-200 bg-white text-[var(--shop-text-subtle)]"}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider">
              {tier.tier_name}
            </div>
            <div className="mt-0.5 text-sm font-bold">
              {formatShopPrice(tier.price)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
