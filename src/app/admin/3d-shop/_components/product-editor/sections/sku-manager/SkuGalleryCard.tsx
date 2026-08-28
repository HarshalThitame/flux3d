"use client";

import { useState } from "react";
import Image from "next/image";
import { Box, Loader2, QrCode, Trash2 } from "lucide-react";
import type {
  ShopSku,
  ShopSkuTierPrice,
  SkuStatus,
} from "@/lib/shop/admin-types";
import { comboLabel } from "../../types";
import { deriveSkuStatus } from "@/lib/shop/sku-engine";
import { StockHealthBar } from "./StockHealthBar";
import { MarginBadge } from "./MarginBadge";
import { TierPriceEditor } from "./TierPriceEditor";

const STATUS_BADGES: Record<SkuStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  in_stock: "bg-emerald-100 text-emerald-700",
  low_stock: "bg-amber-100 text-amber-700",
  out_of_stock: "bg-rose-100 text-rose-700",
  unavailable: "bg-gray-200 text-gray-600",
  made_to_order: "bg-[#F4EDDC] text-[#8a6d1a]",
  limited_edition: "bg-[#0F1B3D] text-[#E8CF8B]",
  discontinued: "bg-gray-300 text-gray-600",
};

const STATUS_LABELS: Record<SkuStatus, string> = {
  active: "Active",
  draft: "Draft",
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  unavailable: "Unavailable",
  made_to_order: "Made to Order",
  limited_edition: "Limited Edition",
  discontinued: "Discontinued",
};

const STATUS_OPTIONS: { value: SkuStatus | ""; label: string }[] = [
  { value: "", label: "Derived" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "in_stock", label: "In Stock (legacy)" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "made_to_order", label: "Made to Order" },
  { value: "limited_edition", label: "Limited Edition" },
  { value: "unavailable", label: "Unavailable" },
  { value: "discontinued", label: "Discontinued" },
];

export function SkuGalleryCard({
  sku,
  heroImage,
  productName,
  onUpdate,
  onDelete,
  onGenerateQr,
  tiers,
  onSaveTiers,
  qrBusy,
}: {
  sku: ShopSku;
  heroImage?: string | null;
  productName: string;
  onUpdate: <K extends keyof ShopSku>(key: K, value: ShopSku[K]) => void;
  onDelete: () => void;
  onGenerateQr: () => void;
  tiers: ShopSkuTierPrice[];
  onSaveTiers: (
    prices: { tier_name: string; price: number }[],
  ) => Promise<void>;
  qrBusy: boolean;
}) {
  const [showTiers, setShowTiers] = useState(false);
  const status =
    (sku.status as SkuStatus | null) ??
    deriveSkuStatus(
      Number(sku.stock_quantity) || 0,
      sku.low_stock_threshold ?? 5,
      sku.is_available,
    );
  const discount =
    sku.compare_at_price != null && sku.compare_at_price > sku.price
      ? Math.round(
          ((sku.compare_at_price - sku.price) / sku.compare_at_price) * 100,
        )
      : null;

  return (
    <div className="group overflow-hidden rounded-2xl border border-[#C9A24B]/15 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_28px_rgba(201,162,75,0.18)]">
      <div className="relative h-44 bg-gradient-to-b from-[#F4EDDC] to-white">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={comboLabel(sku.variant_combination)}
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-[#C9A24B]/50">
            <Box className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGES[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        {discount != null && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="absolute bottom-2.5 right-2.5 rounded-lg bg-white/80 p-1.5 text-[#6F7192] opacity-0 shadow transition group-hover:opacity-100 hover:text-rose-600"
          aria-label="Delete SKU"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="text-sm font-bold text-[#0F1B3D]">
            {comboLabel(sku.variant_combination)}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#6F7192]">
              {sku.sku_code}
            </span>
            <span className="text-[11px] text-[#6F7192]">· {productName}</span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#0F1B3D]">
                ₹{Number(sku.price).toLocaleString("en-IN")}
              </span>
              {sku.compare_at_price != null &&
                sku.compare_at_price > sku.price && (
                  <span className="text-sm text-[#6F7192] line-through">
                    ₹{Number(sku.compare_at_price).toLocaleString("en-IN")}
                  </span>
                )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <MarginBadge sku={sku} />
              <select
                value={sku.status ?? ""}
                onChange={(event) =>
                  onUpdate(
                    "status",
                    (event.target.value || null) as SkuStatus | null,
                  )
                }
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] text-[#0F1B3D] outline-none"
                title="Override status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] text-[#6F7192]">
                <input
                  type="checkbox"
                  checked={sku.is_available ?? true}
                  onChange={(event) =>
                    onUpdate("is_available", event.target.checked)
                  }
                  className="h-3.5 w-3.5 accent-[#B8860B]"
                />
                Available
              </label>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowTiers((current) => !current)}
              className="rounded-lg border border-[#C9A24B]/25 px-2.5 py-1 text-[11px] font-semibold text-[#B8860B] transition hover:bg-[#C9A24B]/10"
            >
              {showTiers ? "Hide Tiers" : "Tier Pricing"}
            </button>
            <button
              type="button"
              onClick={onGenerateQr}
              disabled={qrBusy}
              className="inline-flex items-center gap-1 rounded-lg border border-[#0F1B3D]/15 px-2.5 py-1 text-[11px] font-semibold text-[#0F1B3D] transition hover:bg-[#0F1B3D] hover:text-white disabled:opacity-40"
              title="Generate scannable QR code"
            >
              {qrBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <QrCode className="h-3.5 w-3.5" />
              )}
              QR
            </button>
          </div>
        </div>

        {showTiers && (
          <TierPriceEditor sku={sku} tiers={tiers} onSave={onSaveTiers} />
        )}

        <StockHealthBar sku={sku} />
      </div>
    </div>
  );
}
