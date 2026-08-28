"use client";

import { useState } from "react";
import type { ShopSku, SkuStatus } from "@/lib/shop/admin-types";
import { comboLabel } from "../../types";
import { deriveSkuStatus } from "@/lib/shop/sku-engine";

const COLUMNS: { status: SkuStatus | "derived"; label: string; dot: string }[] =
  [
    { status: "in_stock", label: "In Stock", dot: "bg-emerald-500" },
    { status: "low_stock", label: "Low Stock", dot: "bg-amber-400" },
    { status: "out_of_stock", label: "Out of Stock", dot: "bg-rose-500" },
    { status: "made_to_order", label: "Made to Order", dot: "bg-[#C9A24B]" },
    { status: "limited_edition", label: "Limited", dot: "bg-[#0F1B3D]" },
    { status: "unavailable", label: "Unavailable", dot: "bg-gray-400" },
  ];

function effectiveStatus(sku: ShopSku): SkuStatus {
  return (
    (sku.status as SkuStatus | null) ??
    deriveSkuStatus(
      Number(sku.stock_quantity) || 0,
      sku.low_stock_threshold ?? 5,
      sku.is_available ?? true,
    )
  );
}

function mapToColumn(status: SkuStatus): string {
  if (status === "discontinued") return "unavailable";
  if (status === "limited_edition") return "limited_edition";
  return status;
}

export function SkuKanbanBoard({
  skus,
  onUpdateStatus,
}: {
  skus: ShopSku[];
  onUpdateStatus: (skuId: string, status: SkuStatus) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {COLUMNS.map((column) => {
        const items = skus.filter(
          (sku) => mapToColumn(effectiveStatus(sku)) === column.status,
        );
        return (
          <div
            key={column.label}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragId) onUpdateStatus(dragId, column.status as SkuStatus);
              setDragId(null);
            }}
            className="rounded-2xl border border-[#C9A24B]/15 bg-[#FAF7EF] p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F1B3D]">
                  {column.label}
                </span>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#6F7192]">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((sku) => (
                <div
                  key={sku.id}
                  draggable
                  onDragStart={() => setDragId(sku.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`cursor-grab rounded-xl border bg-white p-2.5 transition active:cursor-grabbing ${
                    dragId === sku.id
                      ? "border-[#C9A24B] opacity-50"
                      : "border-gray-100 hover:border-[#C9A24B]/40"
                  }`}
                >
                  <div className="truncate text-xs font-semibold text-[#0F1B3D]">
                    {comboLabel(sku.variant_combination)}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] text-[#6F7192]">
                    {sku.sku_code}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B8860B]">
                      ₹{Number(sku.price).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-[#6F7192]">
                      {Number(sku.stock_quantity) || 0} units
                    </span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#C9A24B]/20 p-4 text-center text-[11px] text-[#6F7192]">
                  No SKUs
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
