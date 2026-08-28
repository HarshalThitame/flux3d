"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import type { SkuDraftRow } from "@/lib/shop/sku-engine";
import { stableStringify } from "@/lib/shop/admin-types";

export function comboKey(combo: Record<string, string | boolean>) {
  return stableStringify(combo as Record<string, unknown>);
}

/**
 * Visual grid of every generated combination. Rows map to option values of the
 * LAST discrete option; each row shows one value per option so admins can
 * include or exclude specific combinations before generating.
 */
export function CombinationMatrix({
  rows,
  included,
  onToggle,
  onToggleAll,
  optionNames,
}: {
  rows: SkuDraftRow[];
  included: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (checked: boolean) => void;
  optionNames: string[];
}) {
  const allSelected =
    rows.length > 0 &&
    rows.every((row) => included.has(comboKey(row.variant_combination)));

  const grouped = useMemo(() => {
    const names = [...optionNames];
    const last = names.pop();
    return { leadColumns: names, lastColumn: last };
  }, [optionNames]);

  const groups = useMemo(() => {
    const map = new Map<string, SkuDraftRow>();
    for (const row of rows) {
      const key = comboKey(row.variant_combination);
      if (!map.has(key)) map.set(key, row);
    }
    return [...map.values()];
  }, [rows]);

  const { leadColumns, lastColumn } = grouped;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#C9A24B]/20">
      <div className="flex items-center justify-between border-b border-[#C9A24B]/20 bg-[#FAF7EF] px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#B8860B]">
          Combination Matrix
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0F1B3D]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
            className="h-4 w-4 accent-[#B8860B]"
          />
          {allSelected ? "All selected" : "Select all"}
        </label>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full bg-white text-left text-xs">
          <thead className="sticky top-0 bg-[#0F1B3D] text-white">
            <tr>
              <th className="px-3 py-2 font-semibold">Include</th>
              {leadColumns.map((name) => (
                <th key={name} className="px-3 py-2 font-semibold">
                  {name}
                </th>
              ))}
              {lastColumn && (
                <th className="px-3 py-2 font-semibold">{lastColumn}</th>
              )}
              <th className="px-3 py-2 text-right font-semibold">Price</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((row) => {
              const key = comboKey(row.variant_combination);
              const selected = included.has(key);
              return (
                <tr
                  key={key}
                  onClick={() => onToggle(key)}
                  className={`cursor-pointer border-b border-gray-100 transition ${
                    selected ? "bg-[#FAF7EF]" : "opacity-55 hover:opacity-90"
                  }`}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggle(key);
                      }}
                      className={`grid h-5 w-5 place-items-center rounded-md border transition ${
                        selected
                          ? "border-[#B8860B] bg-[#B8860B] text-white"
                          : "border-gray-300 bg-white"
                      }`}
                      aria-label={selected ? "Exclude" : "Include"}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </button>
                  </td>
                  {leadColumns.map((name) => (
                    <td key={name} className="px-3 py-2 text-[#0F1B3D]">
                      {String(row.variant_combination[name] ?? "—")}
                    </td>
                  ))}
                  {lastColumn && (
                    <td className="px-3 py-2 font-semibold text-[#0F1B3D]">
                      {String(row.variant_combination[lastColumn] ?? "—")}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right font-semibold text-[#B8860B]">
                    ₹{row.price.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
