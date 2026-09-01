"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  Sparkles,
} from "lucide-react";
import type { DescriptionBlock, DescriptionBlocks } from "@/lib/shop/blocks";
import { useProductEditor } from "../editor-context";
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
  rows = 2,
  fieldContext,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  fieldContext?: string;
}) {
  const { generateAiField, setToast } = useProductEditor();
  const [generating, setGenerating] = useState(false);

  const handleAi = async () => {
    if (!fieldContext) return;
    setGenerating(true);
    try {
      const generated = await generateAiField(fieldContext, value);
      onChange(generated);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "AI generation failed.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[#6F7192]">{label}</span>
        {fieldContext && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void handleAi();
            }}
            disabled={generating}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#6d28d9] bg-[#6d28d9]/5 hover:bg-[#6d28d9]/10 transition disabled:opacity-50"
            title={`Generate ${fieldContext} with AI`}
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI
          </button>
        )}
      </div>
      {textarea ? (
        <textarea
          rows={rows}
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
        fieldContext="heading block title"
      />
      <TextField
        label="Subtitle (optional)"
        value={block.subtitle ?? ""}
        onChange={(subtitle) => onChange({ ...block, subtitle })}
        placeholder="A short elegant line that sets the tone"
        textarea
        fieldContext="heading block subtitle"
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
  const { generateAiField, setToast } = useProductEditor();
  const [generating, setGenerating] = useState(false);

  const handleAi = async () => {
    setGenerating(true);
    try {
      // Strip HTML tags for the draft text to give the AI clean text
      const rawText = block.html.replace(/<[^>]*>?/gm, "");
      const generated = await generateAiField("paragraph narrative", rawText);
      onChange({ ...block, html: generated });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "AI generation failed.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[#6F7192]">Text</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            void handleAi();
          }}
          disabled={generating}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#6d28d9] bg-[#6d28d9]/5 hover:bg-[#6d28d9]/10 transition disabled:opacity-50"
          title={`Generate paragraph with AI`}
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          AI
        </button>
      </div>
      <RichTextEditor
        content={block.html}
        onChange={(html) => onChange({ ...block, html })}
        placeholder="Write product details..."
        disableHeadings
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
        fieldContext="specifications section title"
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
            rows: [...block.rows, { label: "New label", value: "New value" }],
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
        fieldContext="feature grid section title"
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
                fieldContext="feature item title"
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
                fieldContext="feature item description"
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
            items: [
              ...block.items,
              {
                icon: "Sparkles",
                title: "New feature",
                text: "Feature description",
              },
            ],
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
  const { uploadBlockImage, setToast } = useProductEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const publicUrl = await uploadBlockImage(file);
      onChange({ ...block, image_url: publicUrl, alt: block.alt || file.name });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Image upload failed.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={labelClass}>Image</span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#6d28d9]/20 bg-white px-3 py-2.5 text-sm font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <input
              value={block.image_url}
              onChange={(event) =>
                onChange({ ...block, image_url: event.target.value })
              }
              placeholder="...or paste image URL"
              className={`${smallInput} w-full`}
            />
          </div>
          {block.image_url ? (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.image_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-[#6d28d9]/10 object-cover"
              />
              <button
                type="button"
                onClick={() => onChange({ ...block, image_url: "" })}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <X className="h-3.5 w-3.5" />
                Remove image
              </button>
            </div>
          ) : (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#6F7192]">
              <ImagePlus className="h-3.5 w-3.5" />
              Upload or paste an image URL for this split section.
            </p>
          )}
        </div>
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
        fieldContext="quote text"
      />
      <TextField
        label="Attribution (optional)"
        value={block.attribution ?? ""}
        onChange={(attribution) => onChange({ ...block, attribution })}
        placeholder="e.g. Flux3D Design Studio"
        fieldContext="quote attribution"
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

export function BulletGridEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "bullet_grid" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <TextField
        label="Section title (optional)"
        value={block.title ?? ""}
        onChange={(title) => onChange({ ...block, title })}
        placeholder="e.g. What's Included"
        fieldContext="bullet grid section title"
      />
      <div className="space-y-2">
        {block.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="w-40 shrink-0">
              <span className={labelClass}>Icon (optional)</span>
              <IconPicker
                value={item.icon ?? ""}
                onChange={(icon) => {
                  const items = block.items.map((entry, i) =>
                    i === index ? { ...entry, icon: icon || undefined } : entry,
                  );
                  onChange({ ...block, items });
                }}
              />
            </div>
            <TextField
              label="Text"
              value={item.text}
              onChange={(text) => {
                const items = block.items.map((entry, i) =>
                  i === index ? { ...entry, text } : entry,
                );
                onChange({ ...block, items });
              }}
              placeholder="Bullet point text"
              fieldContext="bullet point text"
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...block,
                  items: block.items.filter((_, i) => i !== index),
                })
              }
              disabled={block.items.length <= 1}
              className="mt-6 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="Remove bullet"
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
            items: [
              ...block.items,
              { icon: "CheckCircle2", text: "New bullet point" },
            ],
          })
        }
        disabled={block.items.length >= 12}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#6d28d9]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        Add bullet
      </button>
    </div>
  );
}

export function HtmlEmbedEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "html_embed" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="grid gap-3">
      <label className="block">
        <span className={labelClass}>HTML / Embed code</span>
        <textarea
          rows={6}
          value={block.html}
          onChange={(event) => onChange({ ...block, html: event.target.value })}
          placeholder='<iframe src="..." width="100%" height="400"></iframe>'
          className={`${smallInput} resize-y font-mono text-xs`}
        />
      </label>
      <TextField
        label="Caption (optional)"
        value={block.caption ?? ""}
        onChange={(caption) => onChange({ ...block, caption })}
        placeholder="e.g. 360° product view"
      />
      <p className="text-[11px] text-[#6F7192]">
        Paste raw HTML, iframe embeds, or third-party widget code. This renders
        exactly as written on the product page.
      </p>
    </div>
  );
}

export function SpacerEditor({
  block,
  onChange,
}: {
  block: Extract<DescriptionBlock, { type: "spacer" }>;
  onChange: (block: DescriptionBlock) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-[#6F7192]">Height</span>
      <div className="flex items-center gap-1 rounded-xl border border-[#6d28d9]/10 bg-gray-50 p-1">
        {(
          [
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
            { value: "xl", label: "Extra Large" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange({ ...block, height: option.value })}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              block.height === option.value
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
    case "bullet_grid":
      return <BulletGridEditor block={block} onChange={onChange} />;
    case "html_embed":
      return <HtmlEmbedEditor block={block} onChange={onChange} />;
    case "spacer":
      return <SpacerEditor block={block} onChange={onChange} />;
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
