"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useProductEditor } from "../../editor-context";
import type { DraftVariant } from "../../types";
import type { VariantValueMetadata } from "@/lib/shop/admin-types";

function swatchPreview(
  metadata: VariantValueMetadata | undefined,
  value: string,
  optionType: string,
) {
  if (metadata?.swatch_image_url) {
    return (
      <Image
        src={metadata.swatch_image_url}
        alt={value}
        fill
        sizes="48px"
        className="object-cover"
      />
    );
  }
  if (optionType === "swatch_color" && metadata?.hex_color) {
    return (
      <span
        className="h-full w-full rounded-full"
        style={{ background: metadata.hex_color }}
      />
    );
  }
  return (
    <span className="grid h-full w-full place-items-center text-sm font-bold uppercase text-[#C9A24B]">
      {value.slice(0, 1)}
    </span>
  );
}

export function ValueSwatchCard({
  variant,
  value,
  index,
  total,
  onRemove,
  onRename,
  onUpdateMetadata,
  onMove,
  onGenerateTexture,
  textureBusy,
}: {
  variant: DraftVariant;
  value: string;
  index: number;
  total: number;
  onRemove: () => void;
  onRename: (next: string) => void;
  onUpdateMetadata: (patch: Partial<VariantValueMetadata>) => void;
  onMove: (direction: -1 | 1) => void;
  onGenerateTexture: (value: string) => void;
  textureBusy: boolean;
}) {
  const { uploadImage, setToast } = useProductEditor();
  const [busy, setBusy] = useState(false);
  const metadata = variant.value_metadata?.[value] ?? {};
  const showColor = variant.option_type === "swatch_color";

  async function handleSwatchUpload(file: File) {
    setBusy(true);
    try {
      const url = await uploadImage(file);
      if (typeof url === "string") onUpdateMetadata({ swatch_image_url: url });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Swatch upload failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-[#C9A24B]/15 bg-gradient-to-b from-white to-[#FAF7EF] p-3 shadow-[0_2px_12px_rgba(201,162,75,0.08)] transition hover:border-[#C9A24B]/40">
      <div className="flex flex-col items-center gap-1 pt-1">
        <GripVertical className="h-4 w-4 text-[#C9A24B]/40" />
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
            className="text-[10px] leading-none text-[#6F7192] disabled:opacity-20"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
            className="text-[10px] leading-none text-[#6F7192] disabled:opacity-20"
          >
            ▼
          </button>
        </div>
      </div>

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#C9A24B]/20 bg-[#F4EDDC]">
        {swatchPreview(metadata, value, variant.option_type)}
        <label className="absolute inset-0 grid cursor-pointer place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <ImagePlus className="h-5 w-5 text-white" />
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleSwatchUpload(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(event) => onRename(event.target.value)}
            className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-[#0F1B3D] outline-none transition focus:border-[#C9A24B]/40 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => onGenerateTexture(value)}
            disabled={textureBusy}
            title="Generate a luxury texture swatch with AI"
            className="shrink-0 rounded-lg border border-[#C9A24B]/25 p-1.5 text-[#B8860B] transition hover:bg-[#C9A24B]/10 disabled:opacity-40"
          >
            {textureBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${value}`}
            className="shrink-0 rounded-lg p-1.5 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {showColor && (
            <label className="flex items-center gap-2 rounded-lg border border-[#C9A24B]/15 bg-white px-2 py-1.5">
              <input
                type="color"
                value={
                  metadata.hex_color &&
                  /^#[0-9a-fA-F]{6}$/.test(metadata.hex_color)
                    ? metadata.hex_color
                    : "#C9A24B"
                }
                onChange={(event) =>
                  onUpdateMetadata({ hex_color: event.target.value })
                }
                className="h-5 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-xs text-[#6F7192]">
                {metadata.hex_color ?? "Pick colour"}
              </span>
            </label>
          )}
          <label className="flex items-center gap-1.5 rounded-lg border border-[#C9A24B]/15 bg-white px-2 py-1.5">
            <span className="text-xs text-[#6F7192]">+₹</span>
            <input
              type="number"
              value={metadata.price_modifier ?? ""}
              onChange={(event) =>
                onUpdateMetadata({
                  price_modifier: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="0"
              className="w-full bg-transparent text-xs text-[#0F1B3D] outline-none"
            />
          </label>
        </div>

        <input
          value={metadata.description ?? ""}
          onChange={(event) =>
            onUpdateMetadata({ description: event.target.value })
          }
          placeholder="Luxury micro-description — e.g. Italian full-grain leather, hand-stitched"
          className="w-full rounded-lg border border-[#C9A24B]/15 bg-white px-2 py-1.5 text-xs text-[#6F7192] outline-none transition focus:border-[#C9A24B]/40"
        />
      </div>
    </div>
  );
}
