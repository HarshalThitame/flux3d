"use client";

import type { ShopSku } from "@/lib/shop/admin-types";
import { computeMarginPct, marginTone } from "@/lib/shop/sku-engine";

const TONES: Record<string, { badge: string; dot: string; label: string }> = {
  negative: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    label: "Below cost",
  },
  low: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    label: "Low margin",
  },
  healthy: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Healthy",
  },
  premium: {
    badge: "bg-[#F4EDDC] text-[#8a6d1a] border-[#C9A24B]/40",
    dot: "bg-[#B8860B]",
    label: "Premium",
  },
};

export function MarginBadge({ sku }: { sku: ShopSku }) {
  const margin = computeMarginPct(sku.price, sku.cost_price);
  const tone = marginTone(margin);
  const config = TONES[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.badge}`}
      title={
        sku.cost_price != null
          ? `Cost ₹${sku.cost_price} · Margin ${margin == null ? "—" : `${margin.toFixed(1)}%`}`
          : "Add a cost price to see margin"
      }
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {margin == null ? "No cost" : `${margin.toFixed(0)}%`}
    </span>
  );
}
