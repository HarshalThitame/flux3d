"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { ShopSku, SkuStatus } from "@/lib/shop/admin-types";
import { comboLabel } from "../../types";
import { deriveSkuStatus } from "@/lib/shop/sku-engine";

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

const COLUMNS: { status: SkuStatus | "derived"; label: string; dot: string }[] =
  [
    { status: "active", label: "Active", dot: "bg-emerald-500" },
    { status: "draft", label: "Draft", dot: "bg-slate-400" },
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
      sku.is_available,
    )
  );
}

function mapToColumn(status: SkuStatus): string {
  if (status === "discontinued") return "unavailable";
  if (status === "limited_edition") return "limited_edition";
  if (status === "in_stock") return "active";
  return status;
}

export function SkuKanbanBoard({
  skus,
  onUpdateStatus,
  onDelete,
  deleting,
}: {
  skus: ShopSku[];
  onUpdateStatus: (skuId: string, status: SkuStatus | null) => void;
  onDelete: (skuId: string) => void;
  deleting: Set<string>;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-7">
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
                  <div className="mt-2 flex items-center gap-1.5">
                    <select
                      value={sku.status ?? ""}
                      onChange={(event) =>
                        onUpdateStatus(
                          sku.id,
                          (event.target.value || null) as SkuStatus | null,
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-[10px] text-[#0F1B3D] outline-none"
                      title="Override status"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onDelete(sku.id)}
                      disabled={deleting.has(sku.id)}
                      className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      title="Delete SKU"
                      aria-label={`Delete SKU ${sku.sku_code}`}
                    >
                      {deleting.has(sku.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
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
