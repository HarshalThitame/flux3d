"use client";

import dynamic from "next/dynamic";
import { Plus, Trash2 } from "lucide-react";
import type { DescriptionBlock, DescriptionBlocks } from "@/lib/shop/blocks";
import { IconPicker } from "./IconPicker";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[220px] rounded-xl border border-[#6d28d9]/10 bg-gray-50"
      aria-busy="true"
    />
  ),
});

const smallInput =
  "w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40";
const labelClass = "mb-1.5 block text-xs font-medium text-[#6F7192]";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {textarea ? (
        <textarea
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${smallInput} resize-none`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={smallInput}
        />
      )}
    </label>
  );
}

export function HeadingEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "heading" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="grid gap-3">
      <TextField
        label="Title"
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
        placeholder="e.g. Engineered for the Extraordinary"
      />
      <TextField
        label="Subtitle (optional)"
        value={block.subtitle ?? ""}
        onChange={(subtitle) => onChange({ ...block, subtitle })}
        placeholder="A short elegant line that sets the tone"
        textarea
      />
    </div>
  );
}

export function ParagraphEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "paragraph" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div>
      <span className={labelClass}>Text</span>
      <RichTextEditor
        content={block.html}
        onChange={(html) => onChange({ ...block, html })}
        placeholder="Write product details..."
      />
    </div>
  );
}

export function SpecsTableEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "specs_table" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <TextField
        label="Section title (optional)"
        value={block.title ?? ""}
        onChange={(title) => onChange({ ...block, title })}
        placeholder="e.g. Technical Specifications"
      />
      <div className="space-y-2">
        {block.rows.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <input
              value={row.label}
              onChange={(event) => {
                const rows = block.rows.map((item, i) =>
                  i === index ? { ...item, label: event.target.value } : item,
                );
                onChange({ ...block, rows });
              }}
              placeholder="Label (e.g. Material)"
              className={`${smallInput} w-1/2`}
            />
            <input
              value={row.value}
              onChange={(event) => {
                const rows = block.rows.map((item, i) =>
                  i === index ? { ...item, value: event.target.value } : item,
                );
                onChange({ ...block, rows });
              }}
              placeholder="Value (e.g. Premium Resin)"
              className={`${smallInput} w-1/2`}
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...block,
                  rows: block.rows.filter((_, i) => i !== index),
                })
              }
              disabled={block.rows.length <= 1}
              className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="Remove row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...block,
            rows: [...block.rows, { label: "", value: "" }],
          })
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#6d28d9]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add row
      </button>
    </div>
  );
}

export function FeatureGridEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "feature_grid" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <TextField
        label="Section title (optional)"
        value={block.title ?? ""}
        onChange={(title) => onChange({ ...block, title })}
        placeholder="e.g. Why You'll Love It"
      />
      <div className="space-y-3">
        {block.items.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white/60 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6F7192]">
                Feature {index + 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, i) => i !== index),
                  })
                }
                disabled={block.items.length <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Remove feature"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <span className={labelClass}>Icon</span>
                <IconPicker
                  value={item.icon}
                  onChange={(icon) => {
                    const items = block.items.map((entry, i) =>
                      i === index ? { ...entry, icon } : entry,
                    );
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <TextField
                label="Title"
                value={item.title}
                onChange={(title) => {
                  const items = block.items.map((entry, i) =>
                    i === index ? { ...entry, title } : entry,
                  );
                  onChange({ ...block, items });
                }}
                placeholder="e.g. Precision Crafted"
              />
            </div>
            <div className="mt-2.5">
              <TextField
                label="Description"
                value={item.text}
                onChange={(text) => {
                  const items = block.items.map((entry, i) =>
                    i === index ? { ...entry, text } : entry,
                  );
                  onChange({ ...block, items });
                }}
                placeholder="Short benefit-driven sentence"
                textarea
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...block,
            items: [...block.items, { icon: "Sparkles", title: "", text: "" }],
          })
        }
        disabled={block.items.length >= 6}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#6d28d9]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        Add feature
      </button>
    </div>
  );
}

export function ImageTextSplitEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "image_text_split" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Image URL"
          value={block.image_url}
          onChange={(image_url) => onChange({ ...block, image_url })}
          placeholder="https://... or select from gallery"
        />
        <TextField
          label="Alt text"
          value={block.alt}
          onChange={(alt) => onChange({ ...block, alt })}
          placeholder="Describe the image for SEO"
        />
      </div>
      <div>
        <span className={labelClass}>Text</span>
        <RichTextEditor
          content={block.html}
          onChange={(html) => onChange({ ...block, html })}
          placeholder="Write text to sit beside the image..."
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#6F7192]">
          Image position
        </span>
        <div className="flex items-center gap-1 rounded-xl border border-[#6d28d9]/10 bg-gray-50 p-1">
          {(
            [
              { value: "left", label: "Image Left" },
              { value: "right", label: "Image Right" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...block, align: option.value })}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                block.align === option.value
                  ? "bg-[#6d28d9] text-white"
                  : "text-[#6F7192] hover:bg-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuoteEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "quote" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="grid gap-3">
      <TextField
        label="Quote"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        placeholder="Not just a product. A statement."
        textarea
      />
      <TextField
        label="Attribution (optional)"
        value={block.attribution ?? ""}
        onChange={(attribution) => onChange({ ...block, attribution })}
        placeholder="e.g. Flux3D Design Studio"
      />
    </div>
  );
}

export function DividerEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "divider" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-[#6F7192]">Style</span>
      <div className="flex items-center gap-1 rounded-xl border border-[#6d28d9]/10 bg-gray-50 p-1">
        {(
          [
            { value: "gold", label: "Gold Gradient" },
            { value: "subtle", label: "Subtle" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange({ ...block, style: option.value })}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              block.style === option.value
                ? "bg-[#6d28d9] text-white"
                : "text-[#6F7192] hover:bg-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BlockEditor({
  block,
  onChange,
}: {
  block: DescriptionBlock;
  onChange: (block: DescriptionBlock) => void;
}) {
  switch (block.type) {
    case "heading":
      return <HeadingEditor block={block} onChange={onChange} />;
    case "paragraph":
      return <ParagraphEditor block={block} onChange={onChange} />;
    case "specs_table":
      return <SpecsTableEditor block={block} onChange={onChange} />;
    case "feature_grid":
      return <FeatureGridEditor block={block} onChange={onChange} />;
    case "image_text_split":
      return <ImageTextSplitEditor block={block} onChange={onChange} />;
    case "quote":
      return <QuoteEditor block={block} onChange={onChange} />;
    case "divider":
      return <DividerEditor block={block} onChange={onChange} />;
  }
}

export function updateBlockInList(
  blocks: DescriptionBlocks,
  index: number,
  nextBlock: DescriptionBlock,
): DescriptionBlocks {
  return blocks.map((block, i) => (i === index ? nextBlock : block));
}

export function removeBlockFromList(
  blocks: DescriptionBlocks,
  index: number,
): DescriptionBlocks {
  return blocks.filter((_, i) => i !== index);
}

export function duplicateBlockInList(
  blocks: DescriptionBlocks,
  index: number,
): DescriptionBlocks {
  const block = blocks[index];
  if (!block) return blocks;
  const copy = { ...block } as DescriptionBlock;
  return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
}
