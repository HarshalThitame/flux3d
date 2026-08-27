"use client";

import { useState } from "react";
import {
  Copy,
  Eye,
  GripVertical,
  Heading1,
  Image,
  LayoutGrid,
  Minus,
  Quote,
  Table2,
  Trash2,
  Type,
  ChevronDown,
  Plus,
  Sparkles,
} from "lucide-react";
import type { DescriptionBlocks, BlockType } from "@/lib/shop/blocks";
import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_ORDER,
  createEmptyBlock,
} from "@/lib/shop/blocks";
import {
  BlockEditor,
  duplicateBlockInList,
  removeBlockFromList,
  updateBlockInList,
} from "./editors";
import { AiAssistButton } from "../AiAssist";
import LuxuryDescriptionBlocks from "@/components/shop/blocks/LuxuryDescriptionBlocks";

const BLOCK_ICONS: Record<
  BlockType,
  React.ComponentType<{ className?: string }>
> = {
  heading: Heading1,
  paragraph: Type,
  specs_table: Table2,
  feature_grid: LayoutGrid,
  image_text_split: Image,
  quote: Quote,
  divider: Minus,
};

const BLOCK_ACCENT: Record<BlockType, string> = {
  heading: "text-amber-600 bg-amber-50 border-amber-200",
  paragraph: "text-sky-600 bg-sky-50 border-sky-200",
  specs_table: "text-violet-600 bg-violet-50 border-violet-200",
  feature_grid: "text-emerald-600 bg-emerald-50 border-emerald-200",
  image_text_split: "text-rose-600 bg-rose-50 border-rose-200",
  quote: "text-indigo-600 bg-indigo-50 border-indigo-200",
  divider: "text-slate-500 bg-slate-100 border-slate-200",
};

export function BlockBuilder({
  blocks,
  onChange,
}: {
  blocks: DescriptionBlocks;
  onChange: (blocks: DescriptionBlocks) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);

  function addBlock(type: BlockType) {
    onChange([...blocks, createEmptyBlock(type)]);
    setAddOpen(false);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...blocks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6d28d9]/15 bg-gradient-to-r from-[#6d28d9]/5 to-[#7c3aed]/5 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-[#0F1B3D]">
            Luxury Description Blocks
          </div>
          <div className="mt-0.5 text-xs text-[#6F7192]">
            Build a cinematic, scroll-animated product story. Drag blocks to
            reorder.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((current) => !current)}
            disabled={blocks.length === 0}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              preview
                ? "border-[#6d28d9]/40 bg-[#6d28d9]/10 text-[#6d28d9]"
                : "border-[#6d28d9]/20 bg-white text-[#6d28d9] hover:bg-[#6d28d9]/5"
            }`}
            title="Preview how this renders on the product page"
          >
            <Eye className="h-3.5 w-3.5" />
            {preview ? "Hide Preview" : "Preview"}
          </button>
          <AiAssistButton
            kind="luxury_blocks"
            label="Generate with AI"
            title="Generate the full luxury description with AI"
          />
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#6d28d9]/20 bg-gray-50/60 px-6 py-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#6d28d9]/10 text-[#6d28d9]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0F1B3D]">
              No blocks yet
            </div>
            <div className="mt-1 text-xs text-[#6F7192]">
              Add your first block, or let AI craft a complete luxury
              description for you.
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {BLOCK_TYPE_ORDER.slice(0, 4).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#6d28d9]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/5"
              >
                <Plus className="h-3.5 w-3.5" />
                {BLOCK_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {blocks.map((block, index) => {
              const Icon = BLOCK_ICONS[block.type];
              return (
                <div
                  key={index}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOverIndex(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(index);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={`rounded-2xl border bg-white transition ${
                    overIndex === index &&
                    dragIndex !== null &&
                    dragIndex !== index
                      ? "border-[#6d28d9]/50 shadow-lg"
                      : "border-gray-200"
                  } ${dragIndex === index ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                    <span
                      className="cursor-grab text-[#9aa0b5] transition hover:text-[#6d28d9] active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4.5 w-4.5" />
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${BLOCK_ACCENT[block.type]}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {BLOCK_TYPE_LABELS[block.type]}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onChange(duplicateBlockInList(blocks, index))
                        }
                        className="grid h-8 w-8 place-items-center rounded-lg text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]"
                        title="Duplicate block"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(removeBlockFromList(blocks, index))
                        }
                        className="grid h-8 w-8 place-items-center rounded-lg text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
                        title="Delete block"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <BlockEditor
                      block={block}
                      onChange={(nextBlock) =>
                        onChange(updateBlockInList(blocks, index, nextBlock))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAddOpen((current) => !current)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#6d28d9]/30 bg-[#6d28d9]/5 px-4 py-3 text-sm font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/10"
            >
              {addOpen ? (
                <ChevronDown className="h-4 w-4 rotate-180" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Block
            </button>
            {addOpen && (
              <div className="absolute left-1/2 z-20 mt-2 w-full max-w-md -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl">
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPE_ORDER.map((type) => {
                    const Icon = BLOCK_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-[#0F1B3D] transition hover:border-[#6d28d9]/30 hover:bg-[#6d28d9]/5"
                      >
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${BLOCK_ACCENT[type]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        {BLOCK_TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {preview && (
            <div className="rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#0F1B3D]">
                    Live Preview
                  </div>
                  <div className="mt-0.5 text-xs text-[#6F7192]">
                    Renders exactly as it will appear on the product page.
                  </div>
                </div>
              </div>
              <div className="[&_[style]]:transition [&_.motion-safe]:transition">
                <LuxuryDescriptionBlocks blocks={blocks} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
