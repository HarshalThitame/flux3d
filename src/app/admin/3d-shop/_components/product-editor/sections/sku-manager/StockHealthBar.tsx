"use client";

import type { ShopSku } from "@/lib/shop/admin-types";
import { deriveSkuStatus } from "@/lib/shop/sku-engine";

/**
 * A refined visual stock indicator. Green = healthy, amber = low, red =
 * out/critical, gray = unavailable. Includes a scannable one-glance ratio.
 */
export function StockHealthBar({
  sku,
  max = 50,
}: {
  sku: ShopSku;
  max?: number;
}) {
  const stock = Number(sku.stock_quantity) || 0;
  const threshold = sku.low_stock_threshold ?? 5;
  const status = deriveSkuStatus(stock, threshold, sku.is_available ?? true);

  const pct = Math.min(100, Math.round((stock / max) * 100));
  const color =
    status === "unavailable"
      ? "bg-gray-300"
      : status === "out_of_stock"
        ? "bg-rose-500"
        : status === "low_stock"
          ? "bg-amber-400"
          : "bg-emerald-500";

  const label =
    status === "unavailable"
      ? "Unavailable"
      : status === "out_of_stock"
        ? "Out of stock"
        : status === "low_stock"
          ? `Low stock · ≤${threshold}`
          : `${stock} in stock`;

  return (
    <div className="w-full" title={`${stock} units · threshold ${threshold}`}>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold">
        <span className="uppercase tracking-wider text-[#6F7192]">Stock</span>
        <span className="text-[#0F1B3D]">{label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
