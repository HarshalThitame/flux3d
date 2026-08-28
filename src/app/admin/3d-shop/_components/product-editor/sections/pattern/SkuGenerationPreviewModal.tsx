"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { SkuDraftRow } from "@/lib/shop/sku-engine";
import { CombinationMatrix, comboKey } from "./CombinationMatrix";

export function SkuGenerationPreviewModal({
  open,
  onClose,
  rows,
  optionNames,
  onGenerate,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  rows: SkuDraftRow[];
  optionNames: string[];
  onGenerate: (rows: SkuDraftRow[]) => Promise<void>;
  busy: boolean;
}) {
  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(rows.map((row) => comboKey(row.variant_combination))),
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => included.has(comboKey(row.variant_combination))),
    [rows, included],
  );

  if (!open) return null;

  const uniqueCodes = new Set(selectedRows.map((row) => row.sku_code));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute inset-0 bg-[#05070D]/70 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#C9A24B]/30 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#C9A24B]/20 bg-gradient-to-r from-[#0F1B3D] to-[#1B2A54] px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
              <Sparkles className="h-4 w-4" />
              SKU Generation Preview
            </div>
            <div className="mt-1 text-sm text-white/80">
              Review and refine combinations before committing
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#C9A24B]/20 bg-[#FAF7EF] p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">
                Combinations
              </div>
              <div className="mt-1 text-xl font-bold text-[#0F1B3D]">
                {selectedRows.length}
                <span className="text-sm font-medium text-[#6F7192]">
                  {" "}
                  / {rows.length}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-[#C9A24B]/20 bg-[#FAF7EF] p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">
                Unique Codes
              </div>
              <div className="mt-1 text-xl font-bold text-[#0F1B3D]">
                {uniqueCodes.size}
              </div>
            </div>
            <div className="rounded-xl border border-[#C9A24B]/20 bg-[#FAF7EF] p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">
                Price Range
              </div>
              <div className="mt-1 text-xl font-bold text-[#0F1B3D]">
                {selectedRows.length > 0
                  ? `₹${Math.min(...selectedRows.map((r) => r.price)).toLocaleString("en-IN")} – ₹${Math.max(...selectedRows.map((r) => r.price)).toLocaleString("en-IN")}`
                  : "—"}
              </div>
            </div>
          </div>

          <CombinationMatrix
            rows={rows}
            included={included}
            onToggle={(key) =>
              setIncluded((current) => {
                const next = new Set(current);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            onToggleAll={(checked) =>
              setIncluded(
                checked
                  ? new Set(
                      rows.map((row) => comboKey(row.variant_combination)),
                    )
                  : new Set(),
              )
            }
            optionNames={optionNames}
          />

          <div className="rounded-2xl border border-[#C9A24B]/20 bg-[#0F1B3D] p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Code Preview
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRows.slice(0, 12).map((row) => (
                <span
                  key={row.sku_code}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-[#E8CF8B]"
                >
                  {row.sku_code}
                </span>
              ))}
              {selectedRows.length > 12 && (
                <span className="rounded-lg px-2.5 py-1 text-[11px] text-white/50">
                  +{selectedRows.length - 12} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#C9A24B]/20 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#6F7192] transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || selectedRows.length === 0}
            onClick={() => void onGenerate(selectedRows)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(201,162,75,0.4)] transition hover:brightness-110 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate {selectedRows.length} SKU
            {selectedRows.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
