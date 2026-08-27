"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Loader2, X } from "lucide-react";
import type { MediaItem } from "@/lib/shop/media-pool";
import type { DraftSku, DraftVariant } from "../../types";

export function AssignPanel({
  item,
  variants,
  skus,
  onClose,
  onToggleVariant,
  onToggleSku,
}: {
  item: MediaItem;
  variants: DraftVariant[];
  skus: DraftSku[];
  onClose: () => void;
  onToggleVariant: (
    optionName: string,
    optionValue: string,
    on: boolean,
  ) => Promise<void>;
  onToggleSku: (skuId: string, on: boolean) => Promise<void>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedVariant = (optionName: string, optionValue: string) =>
    item.assignments.some(
      (a) =>
        a.type === "variant_option" &&
        a.optionName === optionName &&
        a.optionValue === optionValue,
    );
  const assignedSku = (skuId: string) =>
    item.assignments.some((a) => a.type === "sku" && a.skuId === skuId);

  async function toggle(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update assignment.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  const discreteVariants = variants.filter(
    (variant) => !["toggle", "text_input"].includes(variant.option_type),
  );
  const assignableSkus = skus.filter(
    (sku) =>
      sku.is_available !== false &&
      Object.keys(sku.variant_combination ?? {}).length > 0,
  );
  const hasVariantTargets = discreteVariants.some(
    (variant) => (variant.values ?? []).length > 0,
  );
  const hasSkuTargets = assignableSkus.length > 0;

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50">
              <Image
                src={item.url}
                alt={item.alt || "Product image"}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1B3D]">Assign image</h3>
              <p className="text-xs text-[#6F7192]">
                Tag this image to variants or SKUs — no need to upload it again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assignment panel"
            className="rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          data-lenis-prevent
          className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5"
        >
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}

          {!hasVariantTargets && !hasSkuTargets && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm font-semibold text-[#0F1B3D]">
                No assignable targets yet.
              </p>
              <p className="mt-1 text-xs text-[#6F7192]">
                Add variant options with values, or generate SKUs first.
              </p>
            </div>
          )}

          {hasVariantTargets && (
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6F7192]">
                Variant options
              </h4>
              <div className="space-y-3">
                {discreteVariants.map((variant) => {
                  const values = (variant.values ?? []).filter(Boolean);
                  if (values.length === 0) return null;
                  return (
                    <div
                      key={variant.id}
                      className="rounded-2xl border border-gray-100 p-3"
                    >
                      <div className="mb-2 text-xs font-bold text-[#0F1B3D]">
                        {variant.option_name}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {values.map((value) => {
                          const key = `v:${variant.option_name}:${value}`;
                          const checked = assignedVariant(
                            variant.option_name,
                            value,
                          );
                          const busy = busyKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void toggle(key, () =>
                                  onToggleVariant(
                                    variant.option_name,
                                    value,
                                    !checked,
                                  ),
                                )
                              }
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                                checked
                                  ? "border-[#6d28d9] bg-[#6d28d9] text-white"
                                  : "border-gray-200 bg-gray-50 text-[#0F1B3D] hover:border-[#6d28d9]/40"
                              }`}
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <span
                                  className={`grid h-3.5 w-3.5 place-items-center rounded-full border ${
                                    checked
                                      ? "border-white/60"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {checked && <Check className="h-2.5 w-2.5" />}
                                </span>
                              )}
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {hasSkuTargets && (
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6F7192]">
                SKUs
              </h4>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {assignableSkus.map((sku) => {
                  const key = `s:${sku.id}`;
                  const checked = assignedSku(sku.id);
                  const busy = busyKey === key;
                  const label = Object.entries(sku.variant_combination ?? {})
                    .map(([name, value]) => `${name}: ${String(value)}`)
                    .join(" · ");
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void toggle(key, () => onToggleSku(sku.id, !checked))
                      }
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition disabled:opacity-60 ${
                        checked
                          ? "border-[#6d28d9] bg-[#6d28d9]/5 text-[#5b21b6]"
                          : "border-gray-200 bg-gray-50 text-[#0F1B3D] hover:border-[#6d28d9]/40"
                      }`}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-md border transition ${
                            checked
                              ? "border-[#6d28d9] bg-[#6d28d9] text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate">{label}</span>
                        <span className="block truncate text-[10px] font-normal text-[#6F7192]">
                          {sku.sku_code}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#0F1B3D] hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
