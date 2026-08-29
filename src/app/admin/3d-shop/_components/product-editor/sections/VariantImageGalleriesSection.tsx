"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { GripVertical, Loader2, Star, Trash2, X } from "lucide-react";
import { useProductEditor } from "../editor-context";
import { Section } from "../ui";
import type { ShopVariantOptionImage } from "@/lib/shop/admin-types";

type GroupKey = `${string}\0${string}`;

function groupKey(optionName: string, optionValue: string): GroupKey {
  return `${optionName}\0${optionValue}`;
}

function parseGroupKey(key: GroupKey) {
  const [optionName, optionValue] = key.split("\0");
  return { optionName, optionValue };
}

export function VariantImageGalleriesSection() {
  const {
    variants,
    variantOptionImages,
    reorderVariantOptionImages,
    updateVariantOptionImage,
    removeVariantOptionImage,
    setToast,
  } = useProductEditor();

  const [dragId, setDragId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const dragGroupRef = useRef<string | null>(null);

  const discreteVariants = useMemo(
    () =>
      variants.filter((v) => !["toggle", "text_input"].includes(v.option_type)),
    [variants],
  );

  const groups = useMemo(() => {
    const map = new Map<
      GroupKey,
      {
        optionName: string;
        optionValue: string;
        images: ShopVariantOptionImage[];
      }
    >();

    for (const variant of discreteVariants) {
      for (const value of variant.values ?? []) {
        const key = groupKey(variant.option_name, value);
        map.set(key, {
          optionName: variant.option_name,
          optionValue: value,
          images: [],
        });
      }
    }

    for (const image of variantOptionImages) {
      const key = groupKey(image.option_name, image.option_value);
      const entry = map.get(key);
      if (entry) entry.images.push(image);
    }

    for (const entry of map.values()) {
      entry.images.sort(
        (a, b) =>
          Number(b.is_primary) - Number(a.is_primary) ||
          a.display_order - b.display_order,
      );
    }

    return Array.from(map.entries())
      .filter(([, entry]) => entry.images.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [discreteVariants, variantOptionImages]);

  const handleSetPrimary = useCallback(
    async (imageId: string) => {
      setBusyId(imageId);
      try {
        await updateVariantOptionImage(imageId, { is_primary: true });
      } catch (err) {
        setToast({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to set primary image.",
        });
      } finally {
        setBusyId(null);
      }
    },
    [updateVariantOptionImage, setToast],
  );

  const handleRemove = useCallback(
    async (imageId: string) => {
      if (!window.confirm("Remove this image from the variant gallery?"))
        return;
      setBusyId(imageId);
      try {
        await removeVariantOptionImage(imageId);
      } catch (err) {
        setToast({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to remove image.",
        });
      } finally {
        setBusyId(null);
      }
    },
    [removeVariantOptionImage, setToast],
  );

  const handleDragStart = useCallback(
    (imageId: string, groupKeyStr: string) => {
      setDragId(imageId);
      dragGroupRef.current = groupKeyStr;
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (targetId: string, groupKeyStr: string) => {
      if (
        !dragId ||
        dragId === targetId ||
        dragGroupRef.current !== groupKeyStr
      ) {
        setDragId(null);
        dragGroupRef.current = null;
        return;
      }
      const { optionName, optionValue } = parseGroupKey(
        groupKeyStr as GroupKey,
      );
      const entry = groups.find(([k]) => k === groupKeyStr)?.[1];
      if (!entry) {
        setDragId(null);
        dragGroupRef.current = null;
        return;
      }
      const currentIds = entry.images.map((img) => img.id);
      const from = currentIds.indexOf(dragId);
      const to = currentIds.indexOf(targetId);
      if (from < 0 || to < 0) {
        setDragId(null);
        dragGroupRef.current = null;
        return;
      }
      const reordered = [...currentIds];
      reordered.splice(from, 1);
      reordered.splice(to, 0, dragId);
      setDragId(null);
      dragGroupRef.current = null;
      try {
        await reorderVariantOptionImages(optionName, optionValue, reordered);
      } catch (err) {
        setToast({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to reorder images.",
        });
      }
    },
    [dragId, groups, reorderVariantOptionImages, setToast],
  );

  if (groups.length === 0) {
    return (
      <Section
        title="Variant Galleries"
        description="Assign images to variant values in the Media section, then reorder and set a primary image here."
      >
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-semibold text-[#0F1B3D]">
            No variant galleries yet.
          </p>
          <p className="mt-1 text-xs text-[#6F7192]">
            Assign images to variant values from the Media pool, then manage
            their order and primary image here.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Variant Galleries"
      description="Reorder images per variant value and set the primary image that appears first on the storefront."
    >
      <div className="space-y-5">
        {groups.map(([key, entry]) => (
          <div
            key={key}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#6F7192]">
                {entry.optionName}
              </div>
              <div className="text-sm font-semibold text-[#0F1B3D]">
                {entry.optionValue}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {entry.images.map((image) => {
                const isDragging = dragId === image.id;
                const isBusy = busyId === image.id;
                return (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => handleDragStart(image.id, key)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(image.id, key)}
                    className={`group relative flex h-[88px] w-[88px] shrink-0 cursor-grab items-center justify-center overflow-hidden rounded-xl border bg-gray-50 transition ${
                      isDragging
                        ? "border-[#6d28d9] opacity-60"
                        : "border-gray-200 hover:border-[#6d28d9]/40"
                    }`}
                  >
                    <Image
                      src={image.image_url}
                      alt={
                        image.alt_text ||
                        `${entry.optionName}: ${entry.optionValue}`
                      }
                      fill
                      sizes="88px"
                      className="object-cover"
                      draggable={false}
                    />
                    {image.is_primary && (
                      <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-[#6d28d9] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                        <Star className="h-2.5 w-2.5 fill-white" />
                        Primary
                      </span>
                    )}
                    {isBusy && (
                      <div className="absolute inset-0 grid place-items-center bg-white/70">
                        <Loader2 className="h-5 w-5 animate-spin text-[#6d28d9]" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-white/90 p-1 transition group-hover:translate-y-0">
                      {!image.is_primary && (
                        <button
                          type="button"
                          title="Set as primary"
                          onClick={() => void handleSetPrimary(image.id)}
                          disabled={isBusy}
                          className="grid h-6 w-6 place-items-center rounded-md bg-[#6d28d9]/10 text-[#6d28d9] transition hover:bg-[#6d28d9]/20"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => void handleRemove(image.id)}
                        disabled={isBusy}
                        className="grid h-6 w-6 place-items-center rounded-md bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="absolute left-0 top-0 h-full w-3 cursor-grab opacity-0 transition group-hover:opacity-100">
                      <GripVertical className="h-4 w-4 text-white drop-shadow" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
