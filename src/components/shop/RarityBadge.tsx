"use client";

import type { ShopSku } from "@/lib/shop/admin-types";

const STYLES: Record<string, { label: string; className: string }> = {
  made_to_order: {
    label: "Made to Order",
    className:
      "border-[var(--shop-gold)]/40 bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]",
  },
  limited_edition: {
    label: "Limited Edition",
    className:
      "border-[var(--shop-text-primary)] bg-[var(--shop-text-primary)] text-white",
  },
  preorder: {
    label: "Made to Order",
    className:
      "border-[var(--shop-gold)]/40 bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]",
  },
};

/**
 * Editorial scarcity / rarity indicator for a resolved SKU.
 */
export default function RarityBadge({ sku }: { sku: ShopSku | null }) {
  if (!sku) return null;

  const key =
    sku.status === "made_to_order" || sku.status === "limited_edition"
      ? sku.status
      : sku.pre_order_eta
        ? "preorder"
        : null;
  if (!key) return null;

  const config = STYLES[key];
  const detail =
    sku.status === "limited_edition"
      ? "Crafted in an exclusive numbered run"
      : sku.pre_order_eta
        ? `Crafted to order · ships ${sku.pre_order_eta}`
        : "Each piece crafted on order";

  return (
    <div
      className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${config.className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {config.label}
      <span className="text-xs font-normal opacity-80">{detail}</span>
    </div>
  );
}
