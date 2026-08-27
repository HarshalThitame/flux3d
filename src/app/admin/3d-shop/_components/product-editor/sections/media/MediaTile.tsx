"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GripVertical,
  Loader2,
  Sparkles,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import type { MediaItem } from "@/lib/shop/media-pool";

export function MediaTile({
  item,
  isCover,
  canReorder,
  aiBusy,
  assigning,
  onSetCover,
  onRemove,
  onDropTarget,
  onDragStart,
  onAltChange,
  onAiAlt,
  onAssign,
}: {
  item: MediaItem;
  isCover: boolean;
  canReorder: boolean;
  aiBusy: boolean;
  assigning: boolean;
  onSetCover: () => void;
  onRemove: () => void;
  onDropTarget: () => void;
  onDragStart: () => void;
  onAltChange: (alt: string) => void;
  onAiAlt: () => void;
  onAssign: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [aspect, setAspect] = useState<number | null>(null);
  const [altDraft, setAltDraft] = useState(item.alt);
  const [altFocused, setAltFocused] = useState(false);

  if (!altFocused && item.alt !== altDraft) setAltDraft(item.alt);

  const variantChips = item.assignments.filter(
    (a) => a.type === "variant_option",
  );
  const skuChips = item.assignments.filter((a) => a.type === "sku");

  return (
    <div
      draggable={canReorder}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (!canReorder) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (!canReorder) return;
        event.preventDefault();
        event.stopPropagation();
        setDragOver(false);
        onDropTarget();
      }}
      className={`group break-inside-avoid rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,27,61,0.05)] transition duration-300 ${
        dragOver
          ? "border-[#6d28d9] ring-2 ring-[#6d28d9]/30"
          : "border-gray-200/80 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,27,61,0.10)]"
      }`}
    >
      <div
        className="relative w-full overflow-hidden rounded-t-2xl bg-gray-50"
        style={{
          aspectRatio: aspect ? `${aspect} / 1` : undefined,
          minHeight: aspect ? undefined : 200,
        }}
      >
        <Image
          src={item.url}
          alt={item.alt || "3D Shop product image"}
          fill
          sizes="(min-width: 1280px) 320px, (min-width: 768px) 260px, 200px"
          className="object-cover"
          onLoad={(event) => {
            const width = event.currentTarget.naturalWidth;
            const height = event.currentTarget.naturalHeight;
            if (width > 0 && height > 0) setAspect(width / height);
          }}
        />

        {/* Cover badge */}
        {isCover && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm backdrop-blur">
            <Star className="h-3 w-3 fill-amber-950" />
            Cover
          </span>
        )}

        {/* Variant-only badge */}
        {!item.inProductGallery && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[#0F1B3D]/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            Variant asset
          </span>
        )}

        {/* Assignment chips */}
        {(variantChips.length > 0 || skuChips.length > 0) && (
          <div className="absolute inset-x-2.5 bottom-2.5 flex flex-wrap gap-1">
            {variantChips.map((chip) => (
              <span
                key={`v-${chip.optionName}-${chip.optionValue}`}
                className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#5b21b6] shadow-sm backdrop-blur"
              >
                {chip.optionName}: {chip.optionValue}
              </span>
            ))}
            {skuChips.slice(0, 2).map((chip) => (
              <span
                key={`s-${chip.skuId}`}
                className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#0F1B3D] shadow-sm backdrop-blur"
              >
                {chip.skuLabel}
              </span>
            ))}
            {skuChips.length > 2 && (
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#0F1B3D] shadow-sm backdrop-blur">
                +{skuChips.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Hover action overlay */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-[#0F1B3D]/70 via-transparent to-transparent p-3 opacity-0 transition duration-300 group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSetCover}
              disabled={isCover}
              title={
                isCover ? "This image is the cover photo" : "Set as cover photo"
              }
              className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#0F1B3D] shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-50"
            >
              <Star
                className={`h-3 w-3 ${isCover ? "fill-amber-400 text-amber-400" : ""}`}
              />
              {isCover ? "Cover" : "Cover"}
            </button>
            <button
              type="button"
              onClick={onAssign}
              disabled={assigning}
              title="Assign to variants or SKUs"
              className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#0F1B3D] shadow-sm backdrop-blur transition hover:bg-white"
            >
              {assigning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Tags className="h-3 w-3" />
              )}
              Assign
            </button>
            <button
              type="button"
              onClick={onAiAlt}
              disabled={aiBusy}
              title="Generate alt text with AI"
              className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#6d28d9] shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
            >
              {aiBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {aiBusy ? "Writing…" : "AI alt"}
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Remove image everywhere"
              className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 shadow-sm backdrop-blur transition hover:bg-white"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center gap-1.5">
          {canReorder && (
            <GripVertical className="h-4 w-4 shrink-0 text-[#c3c7d6]" />
          )}
          <span className="truncate text-[11px] font-medium text-[#6F7192]">
            {item.inProductGallery ? "Product gallery" : "Linked asset"}
          </span>
        </div>
        <label className="flex items-center gap-1.5">
          <input
            value={altDraft}
            onChange={(event) => {
              setAltDraft(event.target.value);
              onAltChange(event.target.value);
            }}
            onFocus={() => setAltFocused(true)}
            onBlur={() => setAltFocused(false)}
            placeholder="Alt text for SEO & accessibility"
            aria-label="Image alt text"
            className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/40 focus:bg-white"
          />
          <button
            type="button"
            onClick={onAiAlt}
            disabled={aiBusy}
            title="Generate alt text with AI"
            aria-label="Generate alt text with AI"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#6d28d9]/20 bg-[#6d28d9]/5 text-[#6d28d9] transition hover:bg-[#6d28d9]/10 disabled:opacity-60"
          >
            {aiBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </label>
      </div>
    </div>
  );
}
