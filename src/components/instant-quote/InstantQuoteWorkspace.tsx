"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import type { AppUserProfile } from "@/lib/auth/server";
import { getMaterialById } from "@/lib/quote/materials";
import { calculateInstantQuote } from "@/lib/quote/pricing-engine";
import type { PricingSettingsInput } from "@/lib/quote/pricing-waterfall";
import {
  getSignedModelUrl,
  saveQuoteToSupabase,
  uploadFileToSupabaseStorage,
  validateModelFile,
} from "@/lib/quote/supabase-storage";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { trackFeatureUsage } from "@/lib/tracking/featureTracker";
import type { ModelMetadata } from "@/lib/quote/server-pricing";
import type {
  ParsedModel,
  QuoteConfig,
  QuoteMaterial,
  UploadState,
} from "@/lib/quote/types";
import { useCart } from "@/lib/cart/context";
import type { CartItem } from "@/lib/cart/types";
import Toast, { type ToastState } from "@/components/quote/Toast";
import Link from "next/link";
import { ORDER_DRAFT_STORAGE_KEY, type OrderDraft } from "@/lib/orders";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import WhatsAppCTABanner from "./WhatsAppCTABanner";

const ViewerSection = dynamic(
  () => import("@/components/instant-quote/ViewerSection"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] animate-pulse rounded-2xl bg-[#070a12]" />
    ),
  },
);

const initialUploadState: UploadState = {
  status: "idle",
  progress: 0,
};

export type InstantQuoteWorkspaceProps = {
  user: AppUserProfile | null;
  materials: QuoteMaterial[];
  initialMaterialId?: string;
  initialModelFile?: {
    fileName: string;
    fileUrl: string;
    material?: string | null;
  };
  pricingSettings: PricingSettingsInput;
  bulkOrderContact: {
    email: string;
    whatsappNumber: string;
  };
};

const WORKSPACE_STORAGE_KEY = "flux3d-workspace-draft";
const QUOTE_ID_STORAGE_KEY = "flux3d-quote-id";
const DEFAULT_AMS_SLOT_COLORS = ["#ffffff", "#000000", "#ff0000", "#0000ff"];
const PRINT_SPEED_MMS = { quality: 80, standard: 150, fast: 220 } as const;

function getInitialQuoteId() {
  if (typeof window === "undefined") return "";
  const stored = sessionStorage.getItem(QUOTE_ID_STORAGE_KEY);
  if (stored) return stored;
  const newId = `F3D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  sessionStorage.setItem(QUOTE_ID_STORAGE_KEY, newId);
  return newId;
}

function subscribeQuoteId() {
  return () => {};
}
function getServerQuoteId() {
  return "";
}

function getInitialWorkspaceConfig(
  defaultConfig: QuoteConfig,
  forceMaterialSelection: boolean,
) {
  if (typeof window === "undefined") return defaultConfig;
  const raw = sessionStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (!raw) return defaultConfig;
  try {
    const parsed = JSON.parse(raw) as { config?: QuoteConfig };
    const merged = { ...defaultConfig, ...parsed.config };
    return forceMaterialSelection
      ? {
          ...merged,
          materialId: defaultConfig.materialId,
          color: defaultConfig.color,
        }
      : merged;
  } catch {
    return defaultConfig;
  }
}

function getModelStoragePath(value: string) {
  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? "quote-models";
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))
    return trimmed;
  try {
    const parsed = new URL(trimmed);
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    const signedPrefix = `/storage/v1/object/sign/${bucket}/`;
    if (parsed.pathname.startsWith(publicPrefix))
      return parsed.pathname.slice(publicPrefix.length);
    if (parsed.pathname.startsWith(signedPrefix))
      return parsed.pathname.slice(signedPrefix.length);
  } catch {
    return null;
  }
  return null;
}

export default function InstantQuoteWorkspace({
  user,
  materials,
  initialMaterialId,
  initialModelFile,
  pricingSettings,
  bulkOrderContact,
}: InstantQuoteWorkspaceProps) {
  if (materials.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] px-4 pb-16 pt-8 text-[#070b1d] md:px-8 md:pt-10 xl:px-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="p-8 text-center text-red-500">
            No materials available
          </div>
        </div>
      </div>
    );
  }
  return (
    <CartEnabledWorkspace
      user={user}
      materials={materials}
      initialMaterialId={initialMaterialId}
      initialModelFile={initialModelFile}
      pricingSettings={pricingSettings}
      bulkOrderContact={bulkOrderContact}
    />
  );
}

function CartEnabledWorkspace({
  user,
  materials,
  initialMaterialId,
  initialModelFile,
  pricingSettings,
  bulkOrderContact,
}: InstantQuoteWorkspaceProps) {
  const { addItem, isInCart } = useCart();
  const supabaseEnabled = hasSupabaseConfig();
  const preferredMaterial = initialMaterialId
    ? getMaterialById(initialMaterialId, materials)
    : undefined;
  const defaultMaterial =
    preferredMaterial ??
    getMaterialById("pla", materials) ??
    getMaterialById("pla-plus", materials) ??
    materials[0];
  const hydratedQuoteId = useSyncExternalStore(
    subscribeQuoteId,
    getInitialQuoteId,
    getServerQuoteId,
  );
  const [quoteIdOverride, setInitialQuoteId] = useState<string | null>(null);
  const initialQuoteId = quoteIdOverride ?? hydratedQuoteId;

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<ParsedModel | null>(null);
  const defaultConfig: QuoteConfig = {
    materialId: defaultMaterial.id,
    color: defaultMaterial.colors[0]?.name ?? "Default",
    infill: 20,
    layerHeight: 0.2,
    quantity: 1,
    postProcessingLevel: "none",
    supports: false,
    amsColorCount: 1,
    amsSlotColors: DEFAULT_AMS_SLOT_COLORS,
    scaleFactor: 100,
    wallCount: 3,
    printSpeedPreset: "standard",
    tolerancePreset: "standard",
  };
  const [config, setConfig] = useState<QuoteConfig>(() =>
    getInitialWorkspaceConfig(defaultConfig, Boolean(initialMaterialId)),
  );
  const [uploadState, setUploadState] =
    useState<UploadState>(initialUploadState);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [activePlateIndex, setActivePlateIndex] = useState(0);
  const sliceDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const sliceRequestRef = useRef(0);

  const [slicerStatus, setSlicerStatus] = useState<string | null>(null);
  const [slicerError, setSlicerError] = useState<string | null>(null);
  const [savingQuote, setSavingQuote] = useState(false);

  const trackedQuoteRef = useRef<string | null>(null);
  const prefilledModelRef = useRef(false);
  const sliceSettingsKey = JSON.stringify({
    layerHeight: config.layerHeight,
    infill: config.infill,
    amsColorCount: config.amsColorCount ?? 1,
    scaleFactor: config.scaleFactor ?? 100,
    wallCount: config.wallCount ?? 3,
    printSpeedPreset: config.printSpeedPreset ?? "standard",
    supports: config.supports,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = { config };
    sessionStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(draft));
  }, [config]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const priceBreakdown = useMemo(
    () =>
      selectedModel?.requiresReview
        ? null
        : calculateInstantQuote(
            selectedModel,
            config,
            materials,
            pricingSettings,
          ),
    [selectedModel, config, materials, pricingSettings],
  );

  useEffect(() => {
    if (
      !selectedModel ||
      !priceBreakdown ||
      !initialQuoteId ||
      trackedQuoteRef.current === initialQuoteId
    )
      return;
    trackedQuoteRef.current = initialQuoteId;
    void trackFeatureUsage(user?.id ?? null, "instant_quote", {
      quoteId: initialQuoteId,
      fileName: selectedModel.fileName,
      materialId: config.materialId,
      color: config.color,
      quantity: config.quantity,
      grandTotal: priceBreakdown.grandTotal,
    }).catch(() => {});
  }, [
    config.color,
    config.materialId,
    config.quantity,
    initialQuoteId,
    priceBreakdown,
    selectedModel,
    user?.id,
  ]);

  const selectedMaterial =
    getMaterialById(config.materialId, materials) ?? materials[0];

  const handleFileSelect = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      for (const f of files) {
        const validationError = validateModelFile(f);
        if (validationError) {
          setFileError(validationError);
          setToast({ type: "error", message: validationError });
          return;
        }
      }

      setUploadedFiles(files);

      const newQuoteId = `F3D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      sessionStorage.setItem("flux3d-quote-id", newQuoteId);
      setInitialQuoteId(newQuoteId);
      setFileError(null);
      setViewerLoading(true);
      setUploadState({
        status: "uploading",
        progress: user && supabaseEnabled ? 0 : 12,
      });

      try {
        const { parseModelFile } = await import("@/lib/quote/model-utils");
        const parsedModels = await Promise.all(
          files.map((f) => parseModelFile(f)),
        );
        const { Group } = await import("three");
        const group = new Group();
        let totalVolume = 0;
        let totalTriangleCount = 0;
        const maxDimensions = { x: 0, y: 0, z: 0 };
        const detectedColors = new Set<string>();

        parsedModels.forEach((pm, i) => {
          pm.object.position.x = i * 150;
          group.add(pm.object);
          totalVolume += pm.volumeMm3;
          totalTriangleCount += pm.triangleCount;
          maxDimensions.x = Math.max(maxDimensions.x, pm.dimensionsMm.x);
          maxDimensions.y = Math.max(maxDimensions.y, pm.dimensionsMm.y);
          maxDimensions.z = Math.max(maxDimensions.z, pm.dimensionsMm.z);
          pm.detectedColors?.forEach((c) => detectedColors.add(c));
        });

        const mergedModel = {
          ...parsedModels[0],
          fileName:
            files.length === 1 ? files[0].name : `${files.length} files`,
          fileSize: files.reduce((acc, f) => acc + f.size, 0),
          object: group,
          volumeMm3: totalVolume,
          triangleCount: totalTriangleCount,
          dimensionsMm: maxDimensions,
          detectedColors: Array.from(detectedColors),
          requiresReview: parsedModels.some((pm) => pm.requiresReview),
        };

        setSelectedModel(mergedModel);
        const detectedSlotColors = mergedModel.detectedColors
          .filter((color) => /^#[0-9a-f]{6}$/i.test(color))
          .slice(0, 4);
        if (detectedSlotColors.length > 0) {
          setConfig((current) => {
            const amsSlotColors = [...DEFAULT_AMS_SLOT_COLORS];
            detectedSlotColors.forEach((color, index) => {
              amsSlotColors[index] = color;
            });
            return {
              ...current,
              amsSlotColors,
              amsColorCount:
                detectedSlotColors.length > 1
                  ? detectedSlotColors.length
                  : current.amsColorCount ?? 1,
            };
          });
        }

        if (user && supabaseEnabled) {
          const uploadResults = await Promise.all(
            files.map((f, i) =>
              uploadFileToSupabaseStorage(
                f,
                user.id,
                newQuoteId + "-" + i,
                (progress) =>
                  setUploadState({
                    status: "uploading",
                    progress: Math.round(progress / files.length),
                  }),
              ),
            ),
          );
          const joinedPath = uploadResults.map((r) => r.path).join(",");
          setUploadState({
            status: "success",
            progress: 100,
            path: joinedPath,
          });
        } else {
          setUploadState({ status: "success", progress: 100 });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not process the uploaded model.";
        setSelectedModel(null);
        setUploadState({ status: "error", progress: 0, error: message });
        setFileError(message);
        setToast({ type: "error", message });
      } finally {
        setViewerLoading(false);
      }
    },
    [materials, supabaseEnabled, user],
  );

  const handleGetPreciseQuote = async () => {
    if (!uploadState.path || !selectedModel) return;
    setSlicerStatus("Uploading model to processing node...");
    setSlicerError(null);
    const requestId = ++sliceRequestRef.current;

    let stepIndex = 0;
    const steps = [
      "Preparing .3mf geometry...",
      "Slicing Model & generating G-Code...",
      "Calculating Waste & AMS Purge...",
      "Finalizing price breakdown...",
    ];
    const progressInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setSlicerStatus(steps[stepIndex]);
    }, 4500);

    try {
      const paths = uploadState.path.split(",");
      const signedUrls = await Promise.all(
        paths.map((p) => getSignedModelUrl(p)),
      );
      const res = await fetch("/api/quote/slice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrls: signedUrls,
          layerHeight: config.layerHeight,
          infill: config.infill,
          numColors: config.amsColorCount ?? 1,
          scalePercent: config.scaleFactor ?? 100,
          wallCount: config.wallCount ?? 3,
          printSpeedMms:
            PRINT_SPEED_MMS[config.printSpeedPreset ?? "standard"],
          supports: config.supports,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.fallback)
        throw new Error(data.error ?? "Slicer unavailable");

      if (requestId === sliceRequestRef.current) {
        setSelectedModel((prev) =>
          prev
            ? { ...prev, slicerResult: { source: "slicer", ...data } }
            : prev,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Slicer failed";
      setSlicerError(msg);
      setToast({
        type: "error",
        message: `Slicer: ${msg}. Quick estimate shown.`,
      });
    } finally {
      clearInterval(progressInterval);
      setSlicerStatus(null);
    }
  };

  useEffect(() => {
    if (!selectedModel || !uploadState.path || uploadState.status !== "success")
      return;

    // A previous slicer response was calculated for different settings. Remove
    // it immediately so pricing falls back to a scaled geometry estimate while
    // the new precise result is in flight.
    sliceRequestRef.current += 1;
    if (selectedModel.slicerResult) {
      setSelectedModel((current) =>
        current ? { ...current, slicerResult: undefined } : current,
      );
    }
    if (sliceDebounceRef.current) clearTimeout(sliceDebounceRef.current);
    sliceDebounceRef.current = setTimeout(() => {
      void handleGetPreciseQuote();
    }, 800);

    return () => {
      if (sliceDebounceRef.current) clearTimeout(sliceDebounceRef.current);
    };
  }, [
    selectedModel?.object,
    uploadState.path,
    uploadState.status,
    sliceSettingsKey,
  ]);

  const handleSaveQuote = async () => {
    if (!supabaseEnabled || !user || !selectedModel || !priceBreakdown) return;
    try {
      setSavingQuote(true);
      await saveQuoteToSupabase({
        userId: user.id,
        quoteId: initialQuoteId,
        name: user.name,
        email: user.email,
        phone: "",
        filePath: uploadState.path || "",
        config,
        notes: "",
        estimate: {
          total: priceBreakdown.grandTotal,
          estimatedHours: priceBreakdown.estimatedHours,
          dimensions: priceBreakdown.dimensionsMm,
        },
      });
      setToast({ type: "success", message: `Quote saved.` });
    } catch (error) {
      setToast({ type: "error", message: "Failed to save quote." });
    } finally {
      setSavingQuote(false);
    }
  };

  const handleAddToCart = () => {
    if (
      !priceBreakdown ||
      !selectedModel ||
      !selectedMaterial ||
      !initialQuoteId ||
      !uploadState.path
    )
      return;
    const cartItem: CartItem = {
      id: initialQuoteId,
      name: selectedModel.fileName,
      quoteId: initialQuoteId,
      fileUrl: uploadState.path,
      fileName: selectedModel.fileName,
      material: selectedMaterial.name,
      color: config.color,
      infill: config.infill,
      layerHeight: config.layerHeight,
      quantity: config.quantity,
      supports: config.supports,
      materialCost: priceBreakdown.materialCost,
      machineCost: priceBreakdown.machineCost,
      subtotal: priceBreakdown.subtotal,
      postProcessingCharges: priceBreakdown.postProcessingCharges,
      overheadPercentage: priceBreakdown.overheadPercentage,
      overheadAmount: priceBreakdown.overheadAmount,
      marginPercentage: priceBreakdown.marginPercentage,
      marginAmount: priceBreakdown.marginAmount,
      totalPrice: priceBreakdown.priceBeforeDiscount,
      cartDiscountAmount: priceBreakdown.cartDiscountAmount,
      cartDiscountPercent: priceBreakdown.cartDiscountPercent,
      finalPrice: priceBreakdown.finalPrice,
      deliveryCharge: priceBreakdown.deliveryCharge,
      grandTotal: priceBreakdown.grandTotal,
      price: priceBreakdown.finalPrice,
      estimatedTime: priceBreakdown.estimatedHours,
      weight: priceBreakdown.materialWeightGrams,
      modelVolumeMm3: selectedModel.volumeMm3,
      difficultyFactor: priceBreakdown.difficultyFactor,
      dimensions: priceBreakdown.dimensionsMm,
      config: { ...config, materialId: selectedMaterial.id },
      addedAt: new Date().toISOString(),
    };
    addItem(cartItem);
    setToast({ type: "success", message: `Added to cart.` });
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#6d28d9]/10 bg-white px-4">
        <span className="font-[var(--font-syne)] font-bold text-[#070b1d]">
          Flux3D Instant Quote
        </span>
        <div className="flex items-center gap-4">
          {!user && <span className="text-xs text-gray-500">Guest</span>}
          {user && <span className="text-xs text-gray-500">{user.email}</span>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          files={uploadedFiles.map((f) => ({ name: f.name, size: f.size }))}
          onAddFiles={(files) => handleFileSelect(files)}
          onRemoveFile={(idx) => {
            const newFiles = [...uploadedFiles];
            newFiles.splice(idx, 1);
            if (newFiles.length === 0) {
              setSelectedModel(null);
              setUploadState(initialUploadState);
            }
            setUploadedFiles(newFiles);
            if (newFiles.length > 0) handleFileSelect(newFiles);
          }}
          plates={selectedModel?.slicerResult?.plates}
          activePlateIndex={activePlateIndex}
          onPlateSelect={setActivePlateIndex}
          amsColorCount={config.amsColorCount ?? 1}
          onAmsColorCountChange={(c) =>
            setConfig({ ...config, amsColorCount: c })
          }
          slicerResult={selectedModel?.slicerResult}
          model={selectedModel}
          detectedColors={selectedModel?.detectedColors ?? []}
          amsSlotColors={config.amsSlotColors ?? DEFAULT_AMS_SLOT_COLORS}
          onAmsSlotColorChange={(slotIndex, color) =>
            setConfig((current) => {
              const amsSlotColors = [
                ...(current.amsSlotColors ?? DEFAULT_AMS_SLOT_COLORS),
              ];
              amsSlotColors[slotIndex] = color;
              return { ...current, amsSlotColors };
            })
          }
          scaleFactor={config.scaleFactor ?? 100}
        />

        <main className="flex flex-1 flex-col bg-[#070a12] relative">
          <ViewerSection
            model={selectedModel}
            isLoading={viewerLoading}
            materialId={config.materialId}
            colorName={config.color}
            isSlicing={!!slicerStatus}
            slicingProgress={slicerStatus ?? undefined}
            activePlateIndex={activePlateIndex}
            amsSlotColors={config.amsSlotColors}
            amsColorCount={config.amsColorCount ?? 1}
          />
          {slicerStatus && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 bg-[#070a12] border border-[#6d28d9]/30 rounded-2xl p-6 text-white shadow-2xl">
                <LoaderCircle className="h-8 w-8 animate-spin text-[#6d28d9]" />
                <span className="text-sm font-medium">{slicerStatus}</span>
              </div>
            </div>
          )}
        </main>

        <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-[#6d28d9]/10 bg-white shadow-sm">
          <RightSidebar
            materials={materials}
            config={config}
            onConfigChange={(update) => setConfig((c) => ({ ...c, ...update }))}
            onMaterialChange={(id) =>
              setConfig((c) => ({ ...c, materialId: id }))
            }
            priceBreakdown={priceBreakdown}
            slicerStatus={slicerStatus}
            slicerError={slicerError}
            slicerResult={selectedModel?.slicerResult}
            onSlice={handleGetPreciseQuote}
            onAddToCart={handleAddToCart}
            onSaveQuote={handleSaveQuote}
            isInCart={isInCart(initialQuoteId)}
            user={user}
            pricingSettings={pricingSettings}
            quoteId={initialQuoteId}
            savingQuote={savingQuote}
          />
          <WhatsAppCTABanner
            whatsappNumber={bulkOrderContact.whatsappNumber}
            show={Boolean(selectedModel)}
          />
        </aside>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}
