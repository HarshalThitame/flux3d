"use client";

import { useState } from "react";
import {
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useProductEditor } from "../editor-context";
import { Section, Toggle, inputClass } from "../ui";
import { optionTypes, presetOptionNames, type DraftVariant } from "../types";
import { ValueSwatchCard } from "./variant-builder/ValueSwatchCard";
import { VariantLivePreview } from "./variant-builder/VariantLivePreview";
import { OptionTemplatePicker } from "./variant-builder/OptionTemplatePicker";

export function VariantOptionsSection() {
  const {
    variants,
    addVariant,
    updateVariant,
    deleteVariant,
    reorderVariants,
    dragVariant,
    setDragVariant,
    updateVariantValueMetadata,
    removeVariantValue,
    reorderVariantValues,
    product,
    setToast,
  } = useProductEditor();
  const [showTemplates, setShowTemplates] = useState(false);
  const [valueDraft, setValueDraft] = useState<Record<string, string>>({});
  const [textureBusy, setTextureBusy] = useState<Record<string, boolean>>({});
  const [aiSuggestBusy, setAiSuggestBusy] = useState(false);
  const [dragValue, setDragValue] = useState<{
    variantId: string;
    value: string;
  } | null>(null);
  const [addingVariant, setAddingVariant] = useState(false);
  const [deletingVariants, setDeletingVariants] = useState<Set<string>>(
    new Set(),
  );

  async function handleGenerateTexture(
    variantId: string,
    value: string,
    optionName: string,
  ) {
    const key = `${variantId}:${value}`;
    setTextureBusy((current) => ({ ...current, [key]: true }));
    try {
      const response = await fetch("/api/3d-shop/admin/ai/texture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, option_name: optionName }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url)
        throw new Error(data.error || "Texture generation failed.");
      updateVariantValueMetadata(variantId, value, {
        swatch_image_url: data.url,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Texture generation failed.",
      });
    } finally {
      setTextureBusy((current) => ({ ...current, [key]: false }));
    }
  }

  async function commitValue(variantId: string) {
    const draft = valueDraft[variantId] ?? "";
    const next = draft.trim();
    if (!next) return;
    const variant = variants.find((item) => item.id === variantId);
    if (!variant) return;
    const values = variant.values ?? [];
    if (!values.includes(next)) {
      updateVariant(variantId, "values", [...values, next]);
    }
    setValueDraft((current) => ({ ...current, [variantId]: "" }));
  }

  function handleRenameValue(
    variantId: string,
    oldValue: string,
    nextValue: string,
  ) {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant) return;
    const values = variant.values ?? [];
    const next = nextValue.trim();
    if (!next) return;
    if (next === oldValue) return;
    if (values.includes(next)) return;

    const metadata = { ...(variant.value_metadata ?? {}) };
    if (metadata[oldValue]) {
      metadata[next] = metadata[oldValue];
      delete metadata[oldValue];
    }
    updateVariant(
      variantId,
      "values",
      values.map((v) => (v === oldValue ? next : v)),
    );
    updateVariant(variantId, "value_metadata", metadata);
  }

  function moveValue(variantId: string, value: string, direction: -1 | 1) {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant) return;
    const values = [...(variant.values ?? [])];
    const from = values.indexOf(value);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= values.length) return;
    [values[from], values[to]] = [values[to], values[from]];
    reorderVariantValues(variantId, values);
  }

  function dropValue(variantId: string, fromValue: string, toValue: string) {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant || fromValue === toValue) {
      setDragValue(null);
      return;
    }
    const values = [...(variant.values ?? [])];
    const from = values.indexOf(fromValue);
    const to = values.indexOf(toValue);
    if (from < 0 || to < 0) {
      setDragValue(null);
      return;
    }
    values.splice(from, 1);
    values.splice(to, 0, fromValue);
    reorderVariantValues(variantId, values);
    setDragValue(null);
  }

  async function handleAddVariant() {
    setAddingVariant(true);
    try {
      return await addVariant();
    } finally {
      setAddingVariant(false);
    }
  }

  async function handleDeleteVariant(variant: DraftVariant) {
    setDeletingVariants((current) => new Set(current).add(variant.id));
    try {
      await deleteVariant(variant);
    } finally {
      setDeletingVariants((current) => {
        const next = new Set(current);
        next.delete(variant.id);
        return next;
      });
    }
  }

  async function handleApplyTemplate(template: {
    options: {
      name: string;
      type: string;
      values: string[];
      metadata?: Record<string, { hex_color?: string; description?: string }>;
    }[];
  }) {
    for (const option of template.options) {
      const saved = await addVariant();
      const savedId = saved?.id;
      if (!savedId) continue;
      if (option.name) updateVariant(savedId, "option_name", option.name);
      if (option.type)
        updateVariant(
          savedId,
          "option_type",
          option.type as DraftVariant["option_type"],
        );
      updateVariant(savedId, "values", option.values);
      if (option.metadata) {
        const metadata: Record<string, Record<string, unknown>> = {};
        for (const [value, meta] of Object.entries(option.metadata)) {
          metadata[value] = { ...meta };
        }
        updateVariant(savedId, "value_metadata", metadata);
      }
    }
    setShowTemplates(false);
  }

  async function handleAiSuggest() {
    setAiSuggestBusy(true);
    try {
      const response = await fetch("/api/3d-shop/admin/ai/suggest-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: product.name,
          category: product.category_id,
          existing_names: variants.map((variant) => variant.option_name),
        }),
      });
      const data = (await response.json()) as {
        options?: {
          name: string;
          type: string;
          values: string[];
          description?: string;
        }[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "AI could not suggest options.");
      const suggestions = data.options ?? [];
      if (suggestions.length === 0) {
        setToast({ type: "info", message: "No new options suggested." });
        return;
      }
      for (const option of suggestions) {
        if (variants.some((variant) => variant.option_name === option.name))
          continue;
        const saved = await addVariant();
        if (!saved?.id) continue;
        updateVariant(saved.id, "option_name", option.name);
        updateVariant(
          saved.id,
          "option_type",
          option.type as DraftVariant["option_type"],
        );
        updateVariant(saved.id, "values", option.values);
      }
      setToast({
        type: "success",
        message: `Added ${suggestions.length} AI-suggested option${suggestions.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to suggest options. Add an OPENAI_API_KEY to enable AI.",
      });
    } finally {
      setAiSuggestBusy(false);
    }
  }

  return (
    <Section
      title="Variant Options"
      description="Sculpt configurable choices that drive SKU generation — each value is a rich, luxury-grade swatch."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleAddVariant()}
          disabled={addingVariant}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(201,162,75,0.35)] transition hover:brightness-110 disabled:opacity-60"
        >
          {addingVariant ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Variant Option
        </button>
        <button
          type="button"
          onClick={() => setShowTemplates((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#C9A24B]/25 px-4 py-2.5 text-sm font-semibold text-[#B8860B] transition hover:bg-[#C9A24B]/10"
        >
          <Wand2 className="h-4 w-4" />
          Templates
        </button>
        <button
          type="button"
          onClick={() => void handleAiSuggest()}
          disabled={aiSuggestBusy || !product.name}
          className="inline-flex items-center gap-2 rounded-xl border border-[#C9A24B]/25 px-4 py-2.5 text-sm font-semibold text-[#B8860B] transition hover:bg-[#C9A24B]/10 disabled:opacity-40"
          title="Let AI propose the optimal option set for this product"
        >
          {aiSuggestBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI Suggest
        </button>
        {variants.length > 0 && (
          <button
            type="button"
            onClick={() => {
              document
                .getElementById("sec-pattern")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B2A54]"
          >
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            Design SKU Codes →
          </button>
        )}
      </div>

      {showTemplates && <OptionTemplatePicker onApply={handleApplyTemplate} />}

      {variants.length === 0 && !showTemplates ? (
        <div className="rounded-2xl border border-dashed border-[#C9A24B]/30 bg-gradient-to-b from-[#FAF7EF] to-white p-10 text-center">
          <div className="text-sm font-semibold text-[#0F1B3D]">
            No variant options yet.
          </div>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#6F7192]">
            Define options like Material, Colour, or Size — each becomes a
            luxurious, selectable swatch on your product page and drives SKU
            generation.
          </p>
          <button
            type="button"
            onClick={() => void handleAddVariant()}
            disabled={addingVariant}
            className="mt-4 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {addingVariant ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {addingVariant ? "Adding…" : "Add First Variant Option"}
          </button>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {variants.map((variant) => {
              const isCustomName = !presetOptionNames.includes(
                variant.option_name,
              );
              const values = variant.values ?? [];
              const isDiscrete = !["toggle", "text_input"].includes(
                variant.option_type,
              );
              return (
                <div
                  key={variant.id}
                  draggable
                  onDragStart={() => setDragVariant(variant.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void reorderVariants(variant.id)}
                  className={`rounded-2xl border bg-white p-4 transition ${
                    dragVariant === variant.id
                      ? "border-[#C9A24B]/60 shadow-[0_8px_24px_rgba(201,162,75,0.2)]"
                      : "border-[#C9A24B]/15 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <GripVertical className="h-5 w-5 text-[#C9A24B]/40" />
                    <label className="flex min-w-[160px] flex-1 flex-col sm:max-w-[220px]">
                      <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#B8860B]">
                        Option Name
                      </span>
                      <select
                        value={isCustomName ? "Custom..." : variant.option_name}
                        onChange={(event) => {
                          const value =
                            event.target.value === "Custom..."
                              ? ""
                              : event.target.value;
                          updateVariant(variant.id, "option_name", value);
                        }}
                        className={inputClass}
                      >
                        {presetOptionNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-w-[140px] flex-1 flex-col sm:max-w-[200px]">
                      <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#B8860B]">
                        Option Type
                      </span>
                      <select
                        value={variant.option_type}
                        onChange={(event) =>
                          updateVariant(
                            variant.id,
                            "option_type",
                            event.target.value as typeof variant.option_type,
                          )
                        }
                        className={inputClass}
                      >
                        {optionTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="hidden sm:block">
                      <Toggle
                        checked={variant.is_required ?? true}
                        onChange={(checked) =>
                          updateVariant(variant.id, "is_required", checked)
                        }
                        label="Required"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteVariant(variant)}
                      disabled={deletingVariants.has(variant.id)}
                      aria-label={`Delete variant ${variant.option_name}`}
                      className="ml-auto rounded-xl border border-rose-200 p-2.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                    >
                      {deletingVariants.has(variant.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {isCustomName && (
                    <input
                      value={variant.option_name}
                      onChange={(event) =>
                        updateVariant(
                          variant.id,
                          "option_name",
                          event.target.value,
                        )
                      }
                      placeholder="Custom option name"
                      className={`${inputClass} mb-3`}
                    />
                  )}

                  {!isDiscrete ? (
                    <div className="rounded-xl border border-[#C9A24B]/15 bg-[#FAF7EF] px-3 py-3 text-xs text-[#6F7192]">
                      {variant.option_type === "text_input"
                        ? "Customers type a personalisation (e.g. engraving text)."
                        : "Customers toggle this option on or off."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {values.length === 0 && (
                        <div className="rounded-xl border border-dashed border-[#C9A24B]/25 p-4 text-center text-xs text-[#6F7192]">
                          Add values below to create selectable swatches.
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {values.map((value, valueIndex) => (
                          <ValueSwatchCard
                            key={value}
                            variant={variant}
                            value={value}
                            index={valueIndex}
                            total={values.length}
                            onRemove={() =>
                              removeVariantValue(variant.id, value)
                            }
                            onRename={(next) =>
                              handleRenameValue(variant.id, value, next)
                            }
                            onUpdateMetadata={(patch) =>
                              updateVariantValueMetadata(
                                variant.id,
                                value,
                                patch,
                              )
                            }
                            onMove={(direction) =>
                              moveValue(variant.id, value, direction)
                            }
                            onGenerateTexture={(target) =>
                              void handleGenerateTexture(
                                variant.id,
                                target,
                                variant.option_name,
                              )
                            }
                            textureBusy={
                              textureBusy[`${variant.id}:${value}`] ?? false
                            }
                            dragging={
                              dragValue?.variantId === variant.id &&
                              dragValue.value === value
                            }
                            onDragStart={() =>
                              setDragValue({ variantId: variant.id, value })
                            }
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() =>
                              dropValue(
                                variant.id,
                                dragValue?.value ?? value,
                                value,
                              )
                            }
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={valueDraft[variant.id] ?? ""}
                          onChange={(event) =>
                            setValueDraft((current) => ({
                              ...current,
                              [variant.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void commitValue(variant.id);
                            }
                          }}
                          placeholder="Type a value and press Enter — e.g. Italian Leather"
                          className="w-full rounded-xl border border-[#C9A24B]/20 bg-[#FAF7EF] px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none transition focus:border-[#C9A24B]/50"
                        />
                        <button
                          type="button"
                          onClick={() => void commitValue(variant.id)}
                          className="shrink-0 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B2A54]"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <VariantLivePreview variants={variants} />
          </div>
        </div>
      )}
    </Section>
  );
}
