"use client";

import { motion } from "framer-motion";
import type { ShopSelectedOptions } from "@/lib/shop/selection";
import { formatShopPrice } from "@/lib/shop/selection";

/**
 * An elegant, editorial summary of the current configuration — the "build
 * sheet" of the product, shown as refined chips beneath the options.
 */
export default function ConfigurationSummaryBar({
  selected,
  price,
  resolvedLabel,
}: {
  selected: ShopSelectedOptions;
  price: number;
  resolvedLabel?: string | null;
}) {
  const entries = Object.entries(selected).filter(
    ([, value]) => value !== "" && value !== false && value != null,
  );

  const chipText = entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");

  // The resolved SKU label mirrors the chips when a SKU is matched — only
  // surface it when it carries information the chips don't already show.
  const showResolved =
    Boolean(resolvedLabel) && chipText.length > 0 && resolvedLabel !== chipText;

  if (entries.length === 0 && !showResolved) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)]/60"
    >
      <div className="flex items-center justify-between border-b border-[var(--shop-border-light)] px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--shop-text-muted)]">
          Your Configuration
        </span>
        <span className="font-[var(--shop-font-heading)] text-sm font-semibold text-[var(--shop-gold)]">
          {formatShopPrice(price)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {entries.map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--shop-gold)]/25 bg-white px-3 py-1.5 text-xs font-medium text-[var(--shop-text-primary)]"
          >
            <span className="text-[10px] uppercase tracking-wider text-[var(--shop-text-muted)]">
              {key}:
            </span>
            {String(value)}
          </span>
        ))}
        {showResolved && resolvedLabel && (
          <span className="inline-flex items-center rounded-full bg-[var(--shop-gold-faint)] px-3 py-1.5 text-xs font-semibold text-[var(--shop-gold)]">
            {resolvedLabel}
          </span>
        )}
      </div>
    </motion.div>
  );
}
