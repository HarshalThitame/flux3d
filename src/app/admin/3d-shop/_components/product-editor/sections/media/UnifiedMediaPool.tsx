"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useProductEditor } from "../../editor-context";
import { Section } from "../../ui";
import { validateImageFile } from "@/lib/shop/upload";
import { buildMediaPool, type MediaItem } from "@/lib/shop/media-pool";
import { MediaTile } from "./MediaTile";
import { AssignPanel } from "./AssignPanel";
import { MediaLibraryModal } from "./MediaLibraryModal";
import { UploadQueueMinimal, type UploadQueueItem } from "./UploadQueueMinimal";

const UPLOAD_CONCURRENCY = 3;

export function UnifiedMediaPool() {
  const {
    product,
    variants,
    skus,
    variantOptionImages,
    skuImages,
    uploadImage,
    setThumbnail,
    removeImage,
    handleImageDrop,
    setDragImage,
    setImageAlt,
    uploadLandscapeImage,
    removeLandscapeImage,
    attachLibraryImage,
    setToast,
    assignToVariantOption,
    unassignVariantOptionImage,
    assignToSku,
    unassignSkuImage,
    clearSkuVariantImage,
    generateImageAlt,
  } = useProductEditor();

  const pool = useMemo(
    () => buildMediaPool({ product, variantOptionImages, skuImages, skus }),
    [product, variantOptionImages, skuImages, skus],
  );

  const attachedUrls = useMemo(
    () => new Set(pool.map((item) => item.url)),
    [pool],
  );

  const galleryCount = pool.filter((item) => item.inProductGallery).length;
  const variantOnlyCount = pool.length - galleryCount;
  const galleryLimit = 40;

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assignTargetUrl, setAssignTargetUrl] = useState<string | null>(null);
  const [aiBusyUrl, setAiBusyUrl] = useState<string | null>(null);
  const [assignBusyUrl, setAssignBusyUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const assignTarget = assignTargetUrl
    ? (pool.find((item) => item.url === assignTargetUrl) ?? null)
    : null;

  // Upload queue
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const queueRef = useRef<UploadQueueItem[]>([]);
  const runningRef = useRef(0);
  const pumpRef = useRef<() => void>(() => {});

  const syncQueue = useCallback((next: UploadQueueItem[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const patchItem = useCallback(
    (id: string, patch: Partial<UploadQueueItem>) => {
      syncQueue(
        queueRef.current.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      );
    },
    [syncQueue],
  );

  const pump = useCallback(() => {
    while (runningRef.current < UPLOAD_CONCURRENCY) {
      const next = queueRef.current.find((item) => item.status === "queued");
      if (!next) break;
      runningRef.current += 1;
      patchItem(next.id, { status: "uploading", progress: 0 });
      uploadImage(next.file, "gallery", undefined, (progress) =>
        patchItem(next.id, { progress }),
      )
        .then(() => patchItem(next.id, { status: "done", progress: 100 }))
        .catch((error: unknown) =>
          patchItem(next.id, {
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed.",
          }),
        )
        .finally(() => {
          runningRef.current -= 1;
          pumpRef.current();
        });
    }
  }, [patchItem, uploadImage]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const addFiles = useCallback(
    (files: File[]) => {
      const accepted: UploadQueueItem[] = [];
      const rejected: string[] = [];
      for (const file of files) {
        const validationError = validateImageFile(file);
        if (validationError) {
          rejected.push(`${file.name}: ${validationError}`);
          continue;
        }
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`,
          file,
          name: file.name,
          status: "queued",
          progress: 0,
        });
      }
      if (rejected.length > 0) {
        setToast({ type: "error", message: rejected.join(" · ") });
      }
      if (accepted.length === 0) return;
      const remaining = Math.max(0, galleryLimit + 1 - galleryCount);
      const overflow = accepted.slice(remaining);
      syncQueue([...queueRef.current, ...accepted.slice(0, remaining)]);
      if (overflow.length > 0) {
        setToast({
          type: "error",
          message: `Product gallery is limited to ${galleryLimit} images — ${overflow.length} file(s) skipped.`,
        });
      }
      pump();
    },
    [galleryCount, galleryLimit, pump, setToast, syncQueue],
  );

  const retryItem = useCallback(
    (id: string) => {
      patchItem(id, { status: "queued", progress: 0, error: undefined });
      pump();
    },
    [patchItem, pump],
  );

  const dismissItem = useCallback(
    (id: string) => {
      syncQueue(queueRef.current.filter((item) => item.id !== id));
    },
    [syncQueue],
  );

  const handleRemove = useCallback(
    async (item: MediaItem) => {
      const isCover = product.thumbnail_url === item.url;
      const notes: string[] = [];
      if (isCover) notes.push("the next image will become the cover");
      if (item.assignments.length > 0) {
        notes.push(
          `it will also be removed from ${item.assignments.length} variant/SKU target${item.assignments.length === 1 ? "" : "s"}`,
        );
      }
      const confirmed = window.confirm(
        `Are you sure you want to remove this image?${
          notes.length > 0 ? ` ${notes.join(" and ")}.` : ""
        } This will delete it from the database permanently.`,
      );
      if (!confirmed) return;
      try {
        await removeImage(item.url);
        if (assignTargetUrl === item.url) setAssignTargetUrl(null);
        setToast({ type: "success", message: "Image removed." });
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to remove image. Please retry.",
        });
      }
    },
    [assignTargetUrl, product.thumbnail_url, removeImage, setToast],
  );

  async function handleAiAlt(url: string) {
    setAiBusyUrl(url);
    try {
      await generateImageAlt(url);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "AI alt text generation failed.",
      });
    } finally {
      setAiBusyUrl(null);
    }
  }

  async function handleToggleVariant(
    optionName: string,
    optionValue: string,
    on: boolean,
  ) {
    if (!assignTarget) return;
    if (on) {
      await assignToVariantOption(assignTarget.url, optionName, optionValue);
      return;
    }
    const match = assignTarget.assignments.find(
      (a) =>
        a.type === "variant_option" &&
        a.optionName === optionName &&
        a.optionValue === optionValue,
    );
    if (match) await unassignVariantOptionImage(match.imageId);
  }

  async function handleToggleSku(skuId: string, on: boolean) {
    if (!assignTarget) return;
    if (on) {
      await assignToSku(assignTarget.url, skuId);
      return;
    }
    const match = assignTarget.assignments.find(
      (a) => a.type === "sku" && a.skuId === skuId,
    );
    if (match) {
      if (match.imageId.startsWith("variant_image_url:")) {
        await clearSkuVariantImage(skuId);
      } else {
        await unassignSkuImage(match.imageId);
      }
    }
  }

  return (
    <Section
      title="Media"
      description="One visual pool for every image — upload once, then assign the same shot to any variant or SKU. The first gallery image becomes the cover photo."
    >
      {/* Counter + library */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#6d28d9]/10 px-3 py-1 text-xs font-bold text-[#6d28d9]">
            {galleryCount} / {galleryLimit} gallery
          </span>
          {variantOnlyCount > 0 && (
            <span className="rounded-full bg-[#0F1B3D]/5 px-3 py-1 text-xs font-semibold text-[#0F1B3D]">
              {variantOnlyCount} linked asset{variantOnlyCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#6d28d9]/20 px-3 py-2 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/5"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Pick from library
        </button>
      </div>

      {/* Editorial drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload product images"
        onClick={() =>
          document.getElementById("unified-media-file-input")?.click()
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ")
            document.getElementById("unified-media-file-input")?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          addFiles(Array.from(event.dataTransfer.files ?? []));
        }}
        className={`group relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition ${
          dragOver
            ? "border-[#6d28d9] bg-[#6d28d9]/10"
            : "border-[#6d28d9]/25 bg-gradient-to-br from-[#6d28d9]/[0.04] via-white to-[#6d28d9]/[0.04]"
        }`}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#6d28d9]/10 text-[#6d28d9] transition group-hover:scale-105">
          <Upload className="h-5 w-5" />
        </span>
        <span className="mt-3 text-sm font-bold text-[#0F1B3D]">
          Drop your story here
        </span>
        <span className="mt-1 max-w-sm text-xs text-[#6F7192]">
          Drop images or click to browse · JPG, PNG, WebP, or GIF · up to 8 MB
          each · first image becomes the cover
        </span>
        <input
          id="unified-media-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      <LandscapeImageUpload
        url={product.landscape_image_url}
        onUpload={uploadLandscapeImage}
        onRemove={removeLandscapeImage}
        onError={(message) => setToast({ type: "error", message })}
      />

      {/* Masonry pool */}
      {pool.length > 0 && (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          {pool.map((item) => (
            <MediaTile
              key={item.url}
              item={item}
              isCover={product.thumbnail_url === item.url}
              canReorder={item.inProductGallery}
              aiBusy={aiBusyUrl === item.url}
              assigning={assignBusyUrl === item.url}
              onSetCover={() => setThumbnail(item.url)}
              onRemove={() => void handleRemove(item)}
              onDropTarget={() => handleImageDrop(item.url)}
              onDragStart={() => setDragImage(item.url)}
              onAltChange={(alt) => setImageAlt(item.url, alt)}
              onAiAlt={() => void handleAiAlt(item.url)}
              onAssign={() => {
                setAssignBusyUrl(item.url);
                window.setTimeout(() => setAssignBusyUrl(null), 400);
                setAssignTargetUrl(item.url);
              }}
            />
          ))}
        </div>
      )}

      {libraryOpen && (
        <MediaLibraryModal
          onClose={() => setLibraryOpen(false)}
          attachedUrls={attachedUrls}
          onPick={(url) => {
            if (!attachedUrls.has(url)) attachLibraryImage(url);
            setLibraryOpen(false);
            setAssignTargetUrl(url);
          }}
        />
      )}

      {assignTarget && (
        <AssignPanel
          item={assignTarget}
          variants={variants}
          skus={skus}
          onClose={() => setAssignTargetUrl(null)}
          onToggleVariant={handleToggleVariant}
          onToggleSku={handleToggleSku}
        />
      )}

      <UploadQueueMinimal
        items={queue}
        onRetry={retryItem}
        onDismiss={dismissItem}
        onDismissAll={() => syncQueue([])}
      />
    </Section>
  );
}

function LandscapeImageUpload({
  url,
  onUpload,
  onRemove,
  onError,
}: {
  url: string | null;
  onUpload: (
    file: File,
    onProgress?: (progress: number) => void,
  ) => Promise<string | void>;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startUpload = useCallback(
    (file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }
      setUploading(true);
      setProgress(0);
      void onUpload(file, setProgress)
        .then(() => setProgress(100))
        .catch((error: unknown) =>
          onError(
            error instanceof Error
              ? error.message
              : "Landscape image upload failed.",
          ),
        )
        .finally(() => setUploading(false));
    },
    [onError, onUpload],
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-[#6d28d9]" />
        <div>
          <div className="text-sm font-semibold text-[#0F1B3D]">
            Landscape image
          </div>
          <div className="mt-0.5 text-xs text-[#6F7192]">
            Wide shot for social share previews, Open Graph cards, and the
            landing carousel.
          </div>
        </div>
      </div>

      {url ? (
        <div
          className={`relative overflow-hidden rounded-2xl border bg-white transition ${
            dragOver
              ? "border-[#6d28d9] ring-2 ring-[#6d28d9]/30"
              : "border-gray-200"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) startUpload(file);
          }}
        >
          <div className="relative aspect-[16/9] bg-gray-100">
            <Image
              src={url}
              alt="Landscape image for social share preview"
              fill
              sizes="600px"
              className="object-cover"
            />
            {dragOver && (
              <span className="absolute inset-x-2 bottom-2 rounded-lg bg-[#6d28d9] px-2 py-1 text-center text-xs font-semibold text-white">
                Drop to replace
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5">
            <span className="truncate text-xs text-[#6F7192]">
              Ready for social cards &amp; carousel
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#6d28d9]/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/5">
                <Upload className="h-3.5 w-3.5" />
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) startUpload(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                aria-label="Remove landscape image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          className={`flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${
            dragOver
              ? "border-[#6d28d9] bg-[#6d28d9]/10"
              : "border-[#6d28d9]/25 bg-white hover:bg-[#6d28d9]/5"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) startUpload(file);
          }}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#6d28d9]" />
          ) : (
            <ImageIcon className="h-6 w-6 text-[#6d28d9]" />
          )}
          <span className="mt-2 text-sm font-semibold text-[#0F1B3D]">
            {uploading ? `Uploading… ${progress}%` : "Upload landscape image"}
          </span>
          <span className="mt-1 max-w-sm text-xs text-[#6F7192]">
            Recommended landscape orientation (e.g. 16:9).
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) startUpload(file);
              event.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
