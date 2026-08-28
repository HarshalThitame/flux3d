"use client";

import { useCallback, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useProductEditor } from "../editor-context";
import { Section } from "../ui";
import { SKU_PATTERN_TOKENS } from "@/lib/shop/admin-types";
import { SkuGenerationPreviewModal } from "./pattern/SkuGenerationPreviewModal";
import type { SkuDraftRow } from "@/lib/shop/sku-engine";
import { isDiscreteOptionType } from "@/lib/shop/sku-engine";

export function SkuPatternStudio() {
  const {
    product,
    updateProduct,
    variants,
    skuPatternTemplates,
    pricingRules,
    generateSkuPreview,
    generateSkus,
    setToast,
  } = useProductEditor();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<SkuDraftRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const pattern = product.sku_pattern || "";
  const optionNames = variants
    .filter((variant) => isDiscreteOptionType(variant.option_type))
    .map((variant) => variant.option_name);

  const canGenerate =
    optionNames.length > 0 &&
    variants.some((variant) => (variant.values ?? []).length > 0);

  function insertToken(token: string) {
    updateProduct("sku_pattern", pattern ? `${pattern}-${token}` : token);
  }

  async function openPreview() {
    if (!canGenerate) {
      setToast({
        type: "error",
        message: "Add values to at least one variant option first.",
      });
      return;
    }
    setBusy(true);
    try {
      const rows = await generateSkuPreview();
      setPreviewRows(rows);
      setPreviewOpen(true);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to compute SKU preview.",
      });
    } finally {
      setBusy(false);
    }
  }

  const runAiSuggestion = useCallback(async () => {
    setAiBusy(true);
    try {
      const response = await fetch(
        "/api/3d-shop/admin/ai/suggest-sku-pattern",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_name: product.name,
            category: product.category_id,
            option_names: optionNames,
          }),
        },
      );
      const data = (await response.json()) as {
        pattern?: string | null;
        error?: string;
      };
      if (!response.ok || !data.pattern)
        throw new Error(data.error || "AI could not suggest a pattern.");
      updateProduct("sku_pattern", data.pattern);
      setToast({ type: "success", message: "AI pattern applied." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to suggest a pattern. Add an OPENAI_API_KEY to enable AI.",
      });
    } finally {
      setAiBusy(false);
    }
  }, [optionNames, product.category_id, product.name, setToast, updateProduct]);

  return (
    <Section
      title="SKU Pattern Studio"
      description="Design elegant, human-readable SKU codes — fully custom pattern-based, never random."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#C9A24B]/20 bg-gradient-to-b from-[#FAF7EF] to-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B8860B]">
                Code Pattern
              </span>
              <button
                type="button"
                onClick={() => void runAiSuggestion()}
                disabled={aiBusy || !product.name}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A24B]/30 px-2.5 py-1.5 text-xs font-semibold text-[#B8860B] transition hover:bg-[#C9A24B]/10 disabled:opacity-40"
                title="Ask AI to design the optimal pattern"
              >
                {aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                AI Suggest
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#C9A24B]/25 bg-white px-3 py-2.5">
              <input
                value={pattern}
                onChange={(event) =>
                  updateProduct("sku_pattern", event.target.value)
                }
                placeholder="{SLUG}-{MATERIAL}-{COLOR}-{SIZE}"
                className="w-full bg-transparent font-mono text-sm text-[#0F1B3D] outline-none placeholder:text-[#6F7192]"
              />
              <button
                type="button"
                onClick={() => updateProduct("sku_pattern", "")}
                className="text-xs text-[#6F7192] transition hover:text-rose-600"
                title="Clear pattern"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {SKU_PATTERN_TOKENS.map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => insertToken(token)}
                  className="rounded-lg border border-[#C9A24B]/20 bg-white px-2 py-1 font-mono text-[11px] text-[#B8860B] transition hover:border-[#C9A24B]/50 hover:bg-[#C9A24B]/10"
                >
                  {token}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] text-[#6F7192]">
              Tokens resolve to abbreviated values:{" "}
              <span className="font-mono">Emerald Green</span> →{" "}
              <span className="font-mono text-[#B8860B]">EMR-GRN</span>,{" "}
              <span className="font-mono">Extra Large</span> →{" "}
              <span className="font-mono text-[#B8860B]">XL</span>. Custom
              per-value slugs can be set on each swatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {skuPatternTemplates.length > 0 && (
              <select
                value=""
                onChange={(event) => {
                  const template = skuPatternTemplates.find(
                    (item) => item.pattern === event.target.value,
                  );
                  if (template) updateProduct("sku_pattern", template.pattern);
                }}
                className="rounded-xl border border-[#C9A24B]/20 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none"
              >
                <option value="">Load pattern template…</option>
                {skuPatternTemplates.map((template) => (
                  <option key={template.id} value={template.pattern}>
                    {template.name} — {template.pattern}
                  </option>
                ))}
              </select>
            )}
            <span className="ml-auto text-xs text-[#6F7192]">
              {optionNames.length} discrete option
              {optionNames.length === 1 ? "" : "s"} ·{" "}
              {pricingRules.filter((rule) => rule.is_active).length} pricing
              rule
              {pricingRules.filter((rule) => rule.is_active).length === 1
                ? ""
                : "s"}{" "}
              active
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#C9A24B]/20 bg-[#0F1B3D] p-5 text-white">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            <Sparkles className="h-4 w-4" />
            Ready to Generate
          </div>
          <p className="text-xs leading-relaxed text-white/60">
            Generate every valid combination with elegant codes and enterprise
            pricing rules applied — or open the preview to fine-tune which
            combinations ship.
          </p>
          <button
            type="button"
            disabled={busy || !canGenerate}
            onClick={() => void openPreview()}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#B8860B] to-[#D4AF37] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(201,162,75,0.4)] transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Computing…
              </span>
            ) : (
              "Preview & Generate SKUs"
            )}
          </button>
        </div>
      </div>

      <SkuGenerationPreviewModal
        key={previewOpen ? "open" : "closed"}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        rows={previewRows}
        optionNames={optionNames}
        busy={busy}
        onGenerate={async (rows) => {
          setBusy(true);
          await generateSkus(rows);
          setBusy(false);
          setPreviewOpen(false);
        }}
      />
    </Section>
  );
}
