"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type {
  ShopSku,
  ShopSkuTierPrice,
  SkuTierName,
} from "@/lib/shop/admin-types";
import { SKU_TIERS, defaultTierPrice } from "@/lib/shop/sku-engine";

/**
 * Inline editor for enterprise tiered pricing (Retail lives on price; Member /
 * VIP / Wholesale overrides live in the tier table).
 */
export function TierPriceEditor({
  sku,
  tiers,
  onSave,
}: {
  sku: ShopSku;
  tiers: ShopSkuTierPrice[];
  onSave: (prices: { tier_name: string; price: number }[]) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<SkuTierName, string>>(() => {
    const initial = {} as Record<SkuTierName, string>;
    for (const tier of SKU_TIERS) {
      const existing = tiers.find((item) => item.tier_name === tier);
      initial[tier] = existing
        ? String(existing.price)
        : String(defaultTierPrice(tier, sku.price));
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const prices = SKU_TIERS.map((tier) => ({
        tier_name: tier,
        price: Number(values[tier]) || 0,
      }));
      await onSave(prices);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#C9A24B]/15 bg-white p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#B8860B]">
          Tiered Pricing
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-[#0F1B3D] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#1B2A54] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {SKU_TIERS.map((tier) => (
          <label key={tier} className="block">
            <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-[#6F7192]">
              {tier}
            </span>
            <input
              type="number"
              value={values[tier]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [tier]: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-[#0F1B3D] outline-none focus:border-[#C9A24B]/40"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
