"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRightLeft, Sparkles } from "lucide-react";
import { useProductEditor } from "../editor-context";
import { AiAssistButton } from "../AiAssist";
import { BlockBuilder } from "../blocks/BlockBuilder";
import { convertRichHtmlToBlocks } from "@/lib/shop/html-to-blocks";
import type { DescriptionBlocks } from "@/lib/shop/blocks";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[220px] rounded-xl border border-[#6d28d9]/10 bg-gray-50"
      aria-busy="true"
    />
  ),
});

type EditorMode = "classic" | "luxury";

export function LongDescriptionSection() {
  const { product, updateProduct, setToast } = useProductEditor();
  const [mode, setMode] = useState<EditorMode>(() => {
    const hasBlocks =
      Array.isArray(product.long_description_blocks) &&
      product.long_description_blocks.length > 0;
    return hasBlocks ? "luxury" : "classic";
  });

  const canConvert =
    Boolean(product.long_description?.trim()) &&
    (!Array.isArray(product.long_description_blocks) ||
      product.long_description_blocks.length === 0);

  function convertToBlocks() {
    if (!canConvert) return;
    const blocks = convertRichHtmlToBlocks(
      product.long_description ?? "",
      product.name,
    );
    if (blocks.length === 0) {
      setToast({
        type: "error",
        message: "Nothing to convert. Your classic description looks empty.",
      });
      return;
    }
    updateProduct("long_description_blocks", blocks);
    updateProduct("long_description", "");
    setMode("luxury");
    setToast({
      type: "success",
      message: `Converted to ${blocks.length} luxury block${blocks.length === 1 ? "" : "s"}.`,
    });
  }

  function applyBlocks(value: unknown) {
    updateProduct("long_description_blocks", value as DescriptionBlocks);
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#6F7192]">
          Long Description
        </span>
        <div className="flex items-center gap-1 rounded-xl border border-[#6d28d9]/10 bg-gray-50 p-1">
          {(
            [
              { value: "classic", label: "Classic" },
              { value: "luxury", label: "Luxury Blocks" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setMode(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === tab.value
                  ? "bg-[#6d28d9] text-white"
                  : "text-[#6F7192] hover:bg-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "classic" ? (
        <div className="space-y-3">
          <RichTextEditor
            content={product.long_description}
            onChange={(value) => updateProduct("long_description", value)}
            placeholder="Write product details..."
          />
          {canConvert && (
            <button
              type="button"
              onClick={convertToBlocks}
              className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/20 bg-gradient-to-r from-[#6d28d9]/5 to-[#7c3aed]/5 px-4 py-2.5 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/10"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Convert to Luxury Blocks
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
          {!canConvert && (
            <p className="text-xs text-[#6F7192]">
              Tip: switch to{" "}
              <span className="font-semibold text-[#6d28d9]">
                Luxury Blocks
              </span>{" "}
              to build a cinematic, scroll-animated product story with feature
              grids and specs tables.
            </p>
          )}
        </div>
      ) : (
        <BlockBuilder
          blocks={product.long_description_blocks}
          onChange={(blocks) => applyBlocks(blocks)}
        />
      )}

      {mode === "luxury" && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#6F7192]">
          <AiAssistButton
            kind="luxury_blocks"
            compact
            label="AI"
            title="Generate luxury description blocks with AI"
          />
          <span>
            Generate a complete block description, then edit any block.
          </span>
        </div>
      )}
    </div>
  );
}
