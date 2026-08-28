"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Columns3,
  Images,
  LayoutGrid,
  Loader2,
  QrCode,
  Search,
  SquareKanban,
  Trash2,
} from "lucide-react";
import { useProductEditor } from "../editor-context";
import { Section } from "../ui";
import { comboLabel } from "../types";
import type { ShopSku, ShopSkuImage, SkuStatus } from "@/lib/shop/admin-types";
import { SkuGalleryCard } from "./sku-manager/SkuGalleryCard";
import { SkuKanbanBoard } from "./sku-manager/SkuKanbanBoard";
import { MarginBadge } from "./sku-manager/MarginBadge";
import { StockHealthBar } from "./sku-manager/StockHealthBar";

type BulkField =
  "price" | "compare_at" | "stock" | "low_stock" | "weight" | "cost";
type ViewMode = "table" | "gallery" | "kanban";

const bulkFields: { key: BulkField; label: string; skuKey: keyof ShopSku }[] = [
  { key: "price", label: "Price (₹)", skuKey: "price" },
  { key: "compare_at", label: "Compare At", skuKey: "compare_at_price" },
  { key: "cost", label: "Cost (₹)", skuKey: "cost_price" },
  { key: "stock", label: "Stock Qty", skuKey: "stock_quantity" },
  { key: "low_stock", label: "Low Stock", skuKey: "low_stock_threshold" },
  { key: "weight", label: "Weight (g)", skuKey: "weight_grams" },
];

const STATUS_OPTIONS: { value: SkuStatus | ""; label: string }[] = [
  { value: "", label: "Derived" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "made_to_order", label: "Made to Order" },
  { value: "limited_edition", label: "Limited Edition" },
  { value: "unavailable", label: "Unavailable" },
  { value: "discontinued", label: "Discontinued" },
];

function SkuVariantImageSummary({ url }: { url: string | null }) {
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 px-2.5 py-2 text-xs font-semibold text-[#6F7192]">
        <Images className="h-4 w-4" />
        Variant
      </span>
    );
  }
  return (
    <span className="relative inline-block h-8 w-8 overflow-hidden rounded-lg border border-gray-200">
      <Image
        src={url}
        alt="Variant"
        fill
        sizes="32px"
        className="object-cover"
      />
    </span>
  );
}

function SkuQrButton({
  url,
  onGenerate,
  busy,
}: {
  url?: string | null;
  onGenerate: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={busy}
      title={url ? "QR generated — regenerate" : "Generate scannable QR code"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:opacity-40 ${
        url
          ? "border-[#B8860B]/40 bg-[#F4EDDC] text-[#8a6d1a]"
          : "border-gray-200 text-[#0F1B3D] hover:border-[#C9A24B]/50"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <QrCode className="h-4 w-4" />
      )}
      {url ? "QR ✓" : "QR"}
    </button>
  );
}

export function SkuManagerSection() {
  const {
    skus,
    skuSectionRef,
    product,
    updateSku,
    bulkUpdateSkus,
    saveAllSkus,
    deleteSku,
    saving,
    defaultWeight,
    setDefaultWeight,
    setToast,
    skuImages,
    tierPrices,
    updateTierPrices,
    generateSkuQr,
  } = useProductEditor();

  const [view, setView] = useState<ViewMode>("table");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<Record<BulkField, string>>({
    price: "",
    compare_at: "",
    cost: "",
    stock: "",
    low_stock: "",
    weight: "",
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SkuStatus>("all");
  const [qrBusy, setQrBusy] = useState<Set<string>>(new Set());

  const validSelected = useMemo(() => {
    const ids = new Set(skus.map((sku) => sku.id));
    return new Set([...selected].filter((id) => ids.has(id)));
  }, [selected, skus]);

  const allSelected = skus.length > 0 && validSelected.size === skus.length;

  const filtered = useMemo(() => {
    let rows = skus;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (sku) =>
          sku.sku_code.toLowerCase().includes(q) ||
          comboLabel(sku.variant_combination).toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      rows = rows.filter(
        (sku) => (sku.status as SkuStatus | null) === statusFilter,
      );
    }
    return rows;
  }, [skus, search, statusFilter]);

  const selectionIds = useMemo(
    () =>
      validSelected.size > 0
        ? skus.filter((sku) => validSelected.has(sku.id)).map((sku) => sku.id)
        : null,
    [skus, validSelected],
  );

  if (skus.length === 0) return null;

  function toggleSelect(skuId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skuId)) next.delete(skuId);
      else next.add(skuId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(skus.map((sku) => sku.id)));
  }

  function handleDeleteSku(skuId: string) {
    void deleteSku(skuId)
      .then(() => {
        setSelected((prev) => {
          if (!prev.has(skuId)) return prev;
          const next = new Set(prev);
          next.delete(skuId);
          return next;
        });
      })
      .catch(() => {});
  }

  function applyBulk(field: BulkField) {
    const value = Number(bulk[field]);
    if (!Number.isFinite(value)) return;
    const fieldConfig = bulkFields.find((item) => item.key === field);
    if (!fieldConfig) return;
    const targetIds = selectionIds ?? skus.map((sku) => sku.id);
    const partial = { [fieldConfig.skuKey]: value } as Partial<ShopSku>;
    bulkUpdateSkus(partial, targetIds);
    setToast({
      type: "success",
      message: `Set ${fieldConfig.label} to ${value} for ${targetIds.length} SKU${targetIds.length === 1 ? "" : "s"}.`,
    });
    setBulk((prev) => ({ ...prev, [field]: "" }));
  }

  function handleEnter(
    event: React.KeyboardEvent<HTMLInputElement>,
    field: keyof ShopSku,
  ) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const layout = (
      event.currentTarget.closest("[data-sku-layout]") as HTMLElement | null
    )?.dataset.skuLayout;
    if (!layout) return;
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `[data-sku-layout="${layout}"] input[data-sku-field="${String(field)}"]`,
      ),
    );
    const currentIndex = inputs.indexOf(event.currentTarget);
    const next = inputs[currentIndex + 1];
    next?.focus();
    next?.select();
  }

  async function handleGenerateQr(skuId: string) {
    setQrBusy((current) => new Set(current).add(skuId));
    try {
      await generateSkuQr(skuId);
    } finally {
      setQrBusy((current) => {
        const next = new Set(current);
        next.delete(skuId);
        return next;
      });
    }
  }

  const numInput =
    "w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#C9A24B]/50 disabled:opacity-50";
  const narrowInput =
    "w-20 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#C9A24B]/50 disabled:opacity-50";

  return (
    <div ref={skuSectionRef}>
      <Section
        title="SKU Manager"
        description="Command center for pricing, inventory, tiers, margin and per-variant media."
      >
        {/* Bulk toolbar */}
        <div className="rounded-2xl border border-[#C9A24B]/15 bg-gradient-to-b from-[#FAF7EF] to-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-[#C9A24B]/20 bg-white p-0.5">
              {(
                [
                  {
                    key: "table",
                    label: "Table",
                    icon: <Columns3 className="h-3.5 w-3.5" />,
                  },
                  {
                    key: "gallery",
                    label: "Gallery",
                    icon: <LayoutGrid className="h-3.5 w-3.5" />,
                  },
                  {
                    key: "kanban",
                    label: "Kanban",
                    icon: <SquareKanban className="h-3.5 w-3.5" />,
                  },
                ] as { key: ViewMode; label: string; icon: React.ReactNode }[]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    view === item.key
                      ? "bg-[#0F1B3D] text-white"
                      : "text-[#6F7192] hover:text-[#0F1B3D]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all SKUs"
                className="h-4 w-4 accent-[#B8860B]"
              />
              {allSelected ? "Clear all" : `Select all (${skus.length})`}
            </label>
            <span className="text-xs text-[#6F7192]">
              {validSelected.size > 0
                ? `${validSelected.size} selected`
                : "No selection — bulk applies to all"}
            </span>
            {validSelected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Clear
              </button>
            )}

            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6F7192]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code or combo…"
                className="w-44 rounded-xl border border-[#C9A24B]/20 bg-white py-2 pl-8 pr-3 text-xs text-[#0F1B3D] outline-none focus:border-[#C9A24B]/50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | SkuStatus)
              }
              className="rounded-xl border border-[#C9A24B]/20 bg-white px-2.5 py-2 text-xs text-[#0F1B3D] outline-none"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.filter((option) => option.value !== "").map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAllSkus()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#D4AF37] px-4 py-2 text-xs font-semibold text-white shadow-[0_3px_10px_rgba(201,162,75,0.35)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save All SKUs
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            {bulkFields.map((field) => (
              <div key={field.key} className="flex items-center gap-1.5">
                <input
                  value={bulk[field.key]}
                  onChange={(event) =>
                    setBulk((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyBulk(field.key);
                  }}
                  placeholder={field.label}
                  type="number"
                  aria-label={`Set ${field.label} for selected SKUs`}
                  className="w-full rounded-xl border border-[#C9A24B]/15 bg-white px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => applyBulk(field.key)}
                  className="shrink-0 rounded-xl border border-[#C9A24B]/25 px-3 py-2 text-sm font-semibold text-[#B8860B] hover:bg-[#C9A24B]/10"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#C9A24B]/15 pt-3">
            <label
              className="text-xs font-medium text-[#6F7192]"
              htmlFor="default-weight"
            >
              Default weight for new SKUs (g)
            </label>
            <input
              id="default-weight"
              value={defaultWeight}
              onChange={(event) => setDefaultWeight(event.target.value)}
              type="number"
              placeholder="e.g. 150"
              className="w-28 rounded-xl border border-[#C9A24B]/15 bg-white px-3 py-2 text-sm outline-none"
            />
            <span className="text-xs text-[#6F7192]">
              Applied when generating new SKU combinations.
            </span>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#C9A24B]/25 p-8 text-center text-sm text-[#6F7192]">
            No SKUs match the current filter.
          </div>
        )}

        {/* TABLE VIEW */}
        {view === "table" && (
          <div
            className="hidden overflow-x-auto rounded-2xl border border-gray-200 md:block"
            data-sku-layout="table"
          >
            <table className="w-full min-w-[1250px] bg-white">
              <thead>
                <tr className="border-b border-gray-100 bg-[#FAF7EF]">
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all SKUs"
                      className="h-4 w-4 accent-[#B8860B]"
                    />
                  </th>
                  {[
                    "Variant Combo",
                    "Code",
                    "Price",
                    "Cost",
                    "Compare",
                    "Stock",
                    "Low Stock",
                    "Margin",
                    "Weight",
                    "Image",
                    "Media",
                    "Status",
                    "Available",
                    "QR",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sku) => {
                  const isSelected = selected.has(sku.id);
                  return (
                    <tr
                      key={sku.id}
                      className={`border-b border-gray-100 last:border-0 ${isSelected ? "bg-[#FAF7EF]" : ""}`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(sku.id)}
                          aria-label="Select SKU"
                          className="h-4 w-4 accent-[#B8860B]"
                        />
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-[#0F1B3D]">
                        {comboLabel(sku.variant_combination)}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-[#6F7192]">
                        {sku.sku_code}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={sku.price}
                          data-sku-field="price"
                          onKeyDown={(event) => handleEnter(event, "price")}
                          onChange={(event) =>
                            updateSku(
                              sku.id,
                              "price",
                              Number(event.target.value),
                            )
                          }
                          className={numInput}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={sku.cost_price ?? ""}
                          data-sku-field="cost_price"
                          onKeyDown={(event) =>
                            handleEnter(event, "cost_price")
                          }
                          onChange={(event) =>
                            updateSku(
                              sku.id,
                              "cost_price",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                          className={narrowInput}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={sku.compare_at_price ?? ""}
                          data-sku-field="compare_at_price"
                          onKeyDown={(event) =>
                            handleEnter(event, "compare_at_price")
                          }
                          onChange={(event) =>
                            updateSku(
                              sku.id,
                              "compare_at_price",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                          className={numInput}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={sku.stock_quantity}
                          data-sku-field="stock_quantity"
                          onKeyDown={(event) =>
                            handleEnter(event, "stock_quantity")
                          }
                          onChange={(event) =>
                            updateSku(
                              sku.id,
                              "stock_quantity",
                              Number(event.target.value),
                            )
                          }
                          className={narrowInput}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={sku.low_stock_threshold ?? 5}
                          data-sku-field="low_stock_threshold"
                          onKeyDown={(event) =>
                            handleEnter(event, "low_stock_threshold")
                          }
                          onChange={(event) =>
                            updateSku(
                              sku.id,
                              "low_stock_threshold",
                              Number(event.target.value),
                            )
                          }
                          className={narrowInput}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <MarginBadge sku={sku} />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={sku.weight_grams ?? ""}
                          data-sku-field="weight_grams"
                          onKeyDown={(event) =>
                            handleEnter(event, "weight_grams")
                          }
                          onChange={(event) =>
                            updateSku(
                              sku.id,
                              "weight_grams",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                          className={numInput}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <SkuVariantImageSummary url={sku.variant_image_url} />
                      </td>
                      <td className="px-3 py-3">
                        <SkuMediaSummary
                          sku={sku}
                          skuImages={skuImages[sku.id] ?? []}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={sku.status ?? ""}
                          onChange={(event) =>
                            updateSku(
                              sku.id,
                              "status",
                              (event.target.value || null) as SkuStatus | null,
                            )
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#0F1B3D] outline-none"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          aria-pressed={sku.is_available ?? true}
                          onClick={() =>
                            updateSku(
                              sku.id,
                              "is_available",
                              !(sku.is_available ?? true),
                            )
                          }
                          className={`relative h-6 w-11 rounded-full transition ${(sku.is_available ?? true) ? "bg-[#B8860B]" : "bg-gray-200"}`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${(sku.is_available ?? true) ? "translate-x-6" : "translate-x-1"}`}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <SkuQrButton
                          url={sku.qr_url}
                          busy={qrBusy.has(sku.id)}
                          onGenerate={() => void handleGenerateQr(sku.id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSku(sku.id)}
                          className="rounded-lg p-2 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete SKU"
                          aria-label={`Delete SKU ${sku.sku_code}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* GALLERY VIEW */}
        {view === "gallery" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((sku) => (
              <SkuGalleryCard
                key={sku.id}
                sku={sku}
                productName={product.name}
                heroImage={sku.variant_image_url}
                onUpdate={(key, value) => updateSku(sku.id, key, value)}
                onDelete={() => handleDeleteSku(sku.id)}
                onGenerateQr={() => void handleGenerateQr(sku.id)}
                tiers={tierPrices[sku.id] ?? []}
                onSaveTiers={(prices) => updateTierPrices(sku.id, prices)}
                qrBusy={qrBusy.has(sku.id)}
              />
            ))}
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === "kanban" && (
          <SkuKanbanBoard
            skus={filtered}
            onUpdateStatus={(skuId, status) =>
              updateSku(skuId, "status", status)
            }
          />
        )}

        {/* MOBILE CARDS */}
        {view === "table" && (
          <div className="grid gap-3 md:hidden" data-sku-layout="cards">
            {filtered.map((sku) => (
              <div
                key={sku.id}
                className={`rounded-2xl border bg-white p-4 ${selected.has(sku.id) ? "border-[#C9A24B]/50" : "border-gray-200"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(sku.id)}
                      onChange={() => toggleSelect(sku.id)}
                      aria-label="Select SKU"
                      className="mt-0.5 h-4 w-4 accent-[#B8860B]"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#0F1B3D]">
                        {comboLabel(sku.variant_combination)}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-[#6F7192]">
                        {sku.sku_code}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SkuQrButton
                      url={sku.qr_url}
                      busy={qrBusy.has(sku.id)}
                      onGenerate={() => void handleGenerateQr(sku.id)}
                    />
                    <button
                      type="button"
                      aria-pressed={sku.is_available ?? true}
                      onClick={() =>
                        updateSku(
                          sku.id,
                          "is_available",
                          !(sku.is_available ?? true),
                        )
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${(sku.is_available ?? true) ? "bg-[#B8860B]" : "bg-gray-200"}`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${(sku.is_available ?? true) ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <StockHealthBar sku={sku} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {bulkFields.map((field) => {
                    const value =
                      field.key === "price"
                        ? sku.price
                        : field.key === "compare_at"
                          ? (sku.compare_at_price ?? "")
                          : field.key === "cost"
                            ? (sku.cost_price ?? "")
                            : field.key === "stock"
                              ? sku.stock_quantity
                              : field.key === "low_stock"
                                ? (sku.low_stock_threshold ?? 5)
                                : (sku.weight_grams ?? "");
                    const onChange =
                      field.key === "price"
                        ? (v: string) => updateSku(sku.id, "price", Number(v))
                        : field.key === "compare_at"
                          ? (v: string) =>
                              updateSku(
                                sku.id,
                                "compare_at_price",
                                v ? Number(v) : null,
                              )
                          : field.key === "cost"
                            ? (v: string) =>
                                updateSku(
                                  sku.id,
                                  "cost_price",
                                  v ? Number(v) : null,
                                )
                            : field.key === "stock"
                              ? (v: string) =>
                                  updateSku(sku.id, "stock_quantity", Number(v))
                              : field.key === "low_stock"
                                ? (v: string) =>
                                    updateSku(
                                      sku.id,
                                      "low_stock_threshold",
                                      Number(v),
                                    )
                                : (v: string) =>
                                    updateSku(
                                      sku.id,
                                      "weight_grams",
                                      v ? Number(v) : null,
                                    );
                    return (
                      <label key={field.key} className="block">
                        <span className="mb-1 block text-[10px] uppercase tracking-wider text-[#6F7192]">
                          {field.label}
                        </span>
                        <input
                          type="number"
                          value={value as string | number}
                          data-sku-field={field.skuKey as string}
                          onKeyDown={(event) =>
                            handleEnter(event, field.skuKey as keyof ShopSku)
                          }
                          onChange={(event) => onChange(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <SkuVariantImageSummary url={sku.variant_image_url} />
                  <div className="flex items-center gap-2">
                    <MarginBadge sku={sku} />
                    <button
                      type="button"
                      onClick={() => handleDeleteSku(sku.id)}
                      className="rounded-lg p-2 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
                      title="Delete SKU"
                      aria-label={`Delete SKU ${sku.sku_code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function SkuMediaSummary({
  sku,
  skuImages,
}: {
  sku: ShopSku;
  skuImages: ShopSkuImage[];
}) {
  const images = [
    ...(sku.variant_image_url ? [sku.variant_image_url] : []),
    ...skuImages.map((image) => image.image_url),
  ].filter((url, index, arr) => arr.indexOf(url) === index);
  const previews = images.slice(0, 3);

  if (images.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 px-2.5 py-2 text-xs font-semibold text-[#6F7192]">
        <Images className="h-4 w-4" />
        Media
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-[#0F1B3D]">
        <Images className="h-4 w-4" />
        {images.length}
      </span>
      {previews.map((url) => (
        <span
          key={url}
          className="relative h-7 w-7 overflow-hidden rounded-md border border-gray-200"
        >
          <Image
            src={url}
            alt="SKU image"
            fill
            sizes="28px"
            className="object-cover"
          />
        </span>
      ))}
    </div>
  );
}
