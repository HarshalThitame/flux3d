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
import { motion, useReducedMotion } from "framer-motion";
import {
  UploadCloud,
  CheckCircle2,
  LoaderCircle,
  Palette,
  Package2,
  Layers3,
  ShieldCheck,
  BookmarkPlus,
  Truck,
  ShoppingCart,
  PackageCheck,
  ArrowRight,
  AlertTriangle,
  FileArchive,
  Cuboid,
} from "lucide-react";
import EmptyState from "@/components/admin/EmptyState";
import type { AppUserProfile } from "@/lib/auth/server";
import { getMaterialById, layerHeightOptions } from "@/lib/quote/materials";
import {
  calculateInstantQuote,
  formatDurationMinutes,
  getPostProcessingCharge,
  postProcessingOptions,
} from "@/lib/quote/pricing-engine";
import type { PricingSettingsInput } from "@/lib/quote/pricing-waterfall";
import {
  getSignedModelUrl,
  uploadFileToSupabaseStorage,
  validateModelFile,
} from "@/lib/quote/supabase-storage";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { trackFeatureUsage } from "@/lib/tracking/featureTracker";
import type { ModelMetadata } from "@/lib/quote/server-pricing";
import type { QuoteAnalysisResponse } from "@/lib/quote/analysis-types";
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

const initialUploadState: UploadState = {
  status: "idle",
  progress: 0,
};

const ViewerSection = dynamic(
  () => import("@/components/instant-quote/ViewerSection"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] animate-pulse rounded-2xl bg-[#070a12]" />
    ),
  },
);

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
          <EmptyState
            title="No materials available"
            description="The admin catalog is empty right now, so ordering is disabled until a material is added in the admin panel."
          />
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

const WORKSPACE_STORAGE_KEY = "flux3d-workspace-draft";
const QUOTE_ID_STORAGE_KEY = "flux3d-quote-id";

function getInitialQuoteId() {
  if (typeof window === "undefined") {
    return "";
  }

  const stored = sessionStorage.getItem(QUOTE_ID_STORAGE_KEY);
  if (stored) {
    return stored;
  }

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
  if (typeof window === "undefined") {
    return defaultConfig;
  }

  const raw = sessionStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (!raw) {
    return defaultConfig;
  }

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

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

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

function CartEnabledWorkspace({
  user,
  materials,
  initialMaterialId,
  initialModelFile,
  pricingSettings,
  bulkOrderContact,
}: InstantQuoteWorkspaceProps) {
  const shouldReduceMotion = useReducedMotion();
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<ParsedModel | null>(null);
  const [analysis, setAnalysis] = useState<QuoteAnalysisResponse | null>(null);
  const [geometryAnalysisId, setGeometryAnalysisId] = useState<string | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [unitConfirmed, setUnitConfirmed] = useState(false);
  const [unitChoice, setUnitChoice] = useState<"mm" | "cm" | "m" | "in" | "ft">("mm");
  const defaultConfig: QuoteConfig = {
    materialId: defaultMaterial.id,
    color: defaultMaterial.colors[0]?.name ?? "Default",
    infill: 20,
    layerHeight: 0.2,
    quantity: 1,
    postProcessingLevel: "none",
    supports: false,
  };
  const [config, setConfig] = useState<QuoteConfig>(() =>
    getInitialWorkspaceConfig(defaultConfig, Boolean(initialMaterialId)),
  );
  const [uploadState, setUploadState] =
    useState<UploadState>(initialUploadState);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [hasUserSelectedMaterial, setHasUserSelectedMaterial] = useState(
    Boolean(initialMaterialId),
  );
  const [savingQuote, setSavingQuote] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const trackedQuoteRef = useRef<string | null>(null);
  const prefilledModelRef = useRef(false);
  const configuredSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = { config };
    sessionStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(draft));
  }, [config]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!activeAnalysisId) return;
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/quote/analyses/${activeAnalysisId}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load analysis status.");
        const next = (await response.json()) as QuoteAnalysisResponse;
        if (cancelled) return;
        setAnalysis(next);
        if (["ready", "manual_review", "failed"].includes(next.status)) return;
        const delay = Math.min(8000, 1000 * 2 ** Math.min(attempt++, 3));
        timer = window.setTimeout(poll, delay);
      } catch {
        if (cancelled) return;
        const delay = Math.min(10000, 1500 * 2 ** Math.min(attempt++, 3));
        timer = window.setTimeout(poll, delay);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeAnalysisId]);

  useEffect(() => {
    if (
      !geometryAnalysisId ||
      !analysis ||
      analysis.status !== "ready" ||
      (analysis.requiresUnitConfirmation && !unitConfirmed)
    ) {
      return;
    }

    const authoritativeConfig = {
      materialId: config.materialId,
      color: config.color,
      layerHeight:
        config.layerHeight === 0.08 || config.layerHeight === 0.12
          ? config.layerHeight
          : (0.2 as const),
      infill: config.infill,
      quantity: config.quantity,
      supports: config.supports ? ("always" as const) : ("auto" as const),
      postProcessingLevel: config.postProcessingLevel,
      unitConfirmed: !analysis.requiresUnitConfirmation || unitConfirmed,
      orientationPolicy: "automatic" as const,
    };
    const signature = JSON.stringify(authoritativeConfig);
    if (configuredSignatureRef.current === signature) return;
    configuredSignatureRef.current = signature;

    void fetch(`/api/quote/analyses/${geometryAnalysisId}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: signature,
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          analysisId?: string;
          error?: string;
        };
        if (!response.ok || !body.analysisId) {
          throw new Error(body.error ?? "Could not queue slicing.");
        }
        setActiveAnalysisId(body.analysisId);
        setAnalysis(null);
      })
      .catch((error) => {
        configuredSignatureRef.current = null;
        setToast({
          type: "error",
          message: error instanceof Error ? error.message : "Could not queue slicing.",
        });
      });
  }, [analysis, config, geometryAnalysisId, unitConfirmed]);

  const confirmUnitScale = useCallback(async () => {
    if (unitChoice === "mm") {
      setUnitConfirmed(true);
      return;
    }
    if (!uploadState.path) return;
    try {
      const response = await fetch("/api/quote/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: uploadState.path,
          unitOverride: unitChoice,
        }),
      });
      const body = (await response.json()) as {
        analysisId?: string;
        error?: string;
      };
      if (!response.ok || !body.analysisId) {
        throw new Error(body.error ?? "Could not apply the selected unit scale.");
      }
      configuredSignatureRef.current = null;
      setUnitConfirmed(true);
      setGeometryAnalysisId(body.analysisId);
      setActiveAnalysisId(body.analysisId);
      setAnalysis(null);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not apply the selected unit scale.",
      });
    }
  }, [unitChoice, uploadState.path]);

  const priceBreakdown = useMemo(() => {
    if (!selectedModel || !analysis?.quote || !analysis.result) return null;
    const authoritativeModel: ParsedModel = {
      ...selectedModel,
      dimensionsMm: analysis.result.dimensionsMm,
      volumeMm3: analysis.result.solidVolumeMm3,
      surfaceAreaMm2:
        analysis.result.surfaceAreaMm2 ?? selectedModel.surfaceAreaMm2,
      triangleCount:
        analysis.result.triangleCount ?? selectedModel.triangleCount,
      supportVolumeMm3: 0,
      requiresReview: false,
    };
    const base = calculateInstantQuote(
      authoritativeModel,
      config,
      materials,
      pricingSettings,
    );
    if (!base) return null;
    const metrics = analysis.result.slicerMetrics;
    const quote = analysis.quote;
    const breakdown = quote.breakdown;
    const subtotal = quote.subtotalPaise / 100;
    const finalPrice =
      (quote.subtotalPaise - quote.discountPaise + quote.gstPaise) / 100;
    return {
      ...base,
      materialWeightGrams:
        metrics?.finishedPartWeightGrams ?? base.materialWeightGrams,
      supportWeightGrams:
        metrics?.supportWeightGrams ?? base.supportWeightGrams,
      estimatedMinutes: metrics ? metrics.elapsedSeconds / 60 : base.estimatedMinutes,
      estimatedHours: metrics ? metrics.elapsedSeconds / 3600 : base.estimatedHours,
      dimensionsMm: analysis.result.dimensionsMm,
      materialCost: breakdown.materialPaise / 100,
      machineCost: breakdown.machinePaise / 100,
      postProcessingCharges: breakdown.postProcessingPaise / 100,
      overheadAmount: breakdown.overheadPaise / 100,
      marginAmount: breakdown.marginPaise / 100,
      subtotal,
      priceBeforeDiscount: subtotal,
      totalPrice: subtotal,
      cartDiscountAmount: quote.discountPaise / 100,
      finalPrice,
      deliveryCharge: quote.deliveryPaise / 100,
      grandTotal: quote.totalPaise / 100,
      price: finalPrice,
      pricePerUnit: subtotal / Math.max(1, config.quantity),
    };
  }, [analysis, config, materials, pricingSettings, selectedModel]);

  // Show the existing geometry-based calculation for planning while the
  // server-side slicer is unavailable. This value is display-only: checkout,
  // saved quotes, and cart insertion continue to require analysis.quote.
  const preliminaryEstimate = useMemo(() => {
    if (
      !selectedModel ||
      selectedModel.requiresReview ||
      !Number.isFinite(selectedModel.volumeMm3) ||
      selectedModel.volumeMm3 <= 0 ||
      Object.values(selectedModel.dimensionsMm).some(
        (dimension) => !Number.isFinite(dimension) || dimension <= 0,
      )
    ) {
      return null;
    }
    return calculateInstantQuote(
      selectedModel,
      config,
      materials,
      pricingSettings,
    );
  }, [config, materials, pricingSettings, selectedModel]);

  useEffect(() => {
    if (
      !selectedModel ||
      !priceBreakdown ||
      !initialQuoteId ||
      trackedQuoteRef.current === initialQuoteId
    ) {
      return;
    }

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
  const selectedMaterial = getMaterialById(config.materialId, materials);
  const postProcessingBaseAmount = priceBreakdown
    ? priceBreakdown.materialCost + priceBreakdown.machineCost
    : 0;
  const selectedColorName = config.color;
  const orderDraft = useMemo<OrderDraft | null>(() => {
    if (
      !initialQuoteId ||
      !selectedMaterial ||
      !selectedModel ||
      !priceBreakdown ||
      !analysis?.quote ||
      !analysis.result ||
      uploadState.status !== "success" ||
      !uploadState.path
    ) {
      return null;
    }

    return {
      quoteVersionId: analysis.quote.quoteVersionId,
      quoteId: initialQuoteId,
      fileUrl: uploadState.path,
      material: selectedMaterial.name,
      color: selectedColorName,
      infill: config.infill,
      layerHeight: config.layerHeight,
      quantity: config.quantity,
      postProcessingLevel: config.postProcessingLevel,
      materialCost: priceBreakdown.materialCost,
      machineCost: priceBreakdown.machineCost,
      subtotal: priceBreakdown.subtotal,
      postProcessingCharges: priceBreakdown.postProcessingCharges,
      totalPrice: priceBreakdown.priceBeforeDiscount,
      cartDiscountAmount: priceBreakdown.cartDiscountAmount,
      cartDiscountPercent: priceBreakdown.cartDiscountPercent,
      finalPrice: priceBreakdown.finalPrice,
      minimumOrderValue: priceBreakdown.minimumOrderValue,
      priceBeforeMinimum: priceBreakdown.priceBeforeMinimum,
      deliveryCharge: priceBreakdown.deliveryCharge,
      grandTotal: priceBreakdown.grandTotal,
      supports: config.supports,
      price: priceBreakdown.finalPrice,
      estimatedTime: priceBreakdown.estimatedHours,
      weight: priceBreakdown.materialWeightGrams,
      difficultyFactor: priceBreakdown.difficultyFactor,
      overheadPercentage: priceBreakdown.overheadPercentage,
      overheadAmount: priceBreakdown.overheadAmount,
      marginPercentage: priceBreakdown.marginPercentage,
      marginAmount: priceBreakdown.marginAmount,
      priceBreakdown: {
        materialCost: priceBreakdown.materialCost,
        machineCost: priceBreakdown.machineCost,
        postProcessingCharges: priceBreakdown.postProcessingCharges,
        subtotal: priceBreakdown.subtotal,
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
        minimumOrderValue: priceBreakdown.minimumOrderValue,
        priceBeforeMinimum: priceBreakdown.priceBeforeMinimum,
      },
      notes: "",
      modelMetadata: {
        fileName: selectedModel.fileName,
        fileSize: selectedModel.fileSize,
        extension: selectedModel.extension,
        volumeMm3: analysis.result.solidVolumeMm3,
        surfaceAreaMm2: analysis.result.surfaceAreaMm2 ?? 0,
        supportVolumeMm3: 0,
        dimensionsMm: analysis.result.dimensionsMm,
        triangleCount: analysis.result.triangleCount ?? 0,
        suggestedMaterialId: selectedModel.suggestedMaterialId,
      } satisfies ModelMetadata,
    };
  }, [
    analysis,
    config.infill,
    config.layerHeight,
    config.quantity,
    config.postProcessingLevel,
    config.supports,
    initialQuoteId,
    priceBreakdown,
    selectedColorName,
    selectedMaterial,
    selectedModel,
    uploadState.path,
    uploadState.status,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (orderDraft) {
      window.sessionStorage.setItem(
        ORDER_DRAFT_STORAGE_KEY,
        JSON.stringify(orderDraft),
      );
      return;
    }

    window.sessionStorage.removeItem(ORDER_DRAFT_STORAGE_KEY);
  }, [orderDraft]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const validationError = validateModelFile(file);
      if (validationError) {
        setFileError(validationError);
        setToast({ type: "error", message: validationError });
        return;
      }

      const newQuoteId = `F3D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      sessionStorage.setItem("flux3d-quote-id", newQuoteId);
      setInitialQuoteId(newQuoteId);

      setFileError(null);
      setSelectedFile(file);
      setAnalysis(null);
      setGeometryAnalysisId(null);
      setActiveAnalysisId(null);
      setUnitConfirmed(false);
      setUnitChoice("mm");
      configuredSignatureRef.current = null;
      setViewerLoading(true);
      setUploadState({
        status: "uploading",
        progress: user && supabaseEnabled ? 0 : 12,
      });

      try {
        if (user && supabaseEnabled) {
          const uploadResult = await uploadFileToSupabaseStorage(
            file,
            user.id,
            newQuoteId,
            (progress) => setUploadState({ status: "uploading", progress }),
          );
          setUploadState(uploadResult);

          const analysisResponse = await fetch("/api/quote/analyses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storagePath: uploadResult.path,
            }),
          });
          const analysisBody = (await analysisResponse.json()) as {
            analysisId?: string;
            error?: string;
          };
          if (!analysisResponse.ok || !analysisBody.analysisId) {
            throw new Error(
              analysisBody.error ?? "Could not start authoritative model analysis.",
            );
          }
          setGeometryAnalysisId(analysisBody.analysisId);
          setActiveAnalysisId(analysisBody.analysisId);
        } else {
          setUploadState({
            status: "success",
            progress: 100,
          });
        }

        let parsedModel: ParsedModel;
        try {
          const { parseModelFile } = await import("@/lib/quote/model-utils");
          parsedModel = await parseModelFile(file);
        } catch {
          parsedModel = {
            fileName: file.name,
            fileSize: file.size,
            extension: file.name.split(".").pop()?.toLowerCase() ?? "",
            object: null as unknown as ParsedModel["object"],
            dimensionsMm: { x: 0, y: 0, z: 0 },
            volumeMm3: 0,
            surfaceAreaMm2: 0,
            supportVolumeMm3: 0,
            triangleCount: 0,
            suggestedMaterialId: materials[0]?.id ?? "pla",
            requiresReview: true,
          };
        }
        setSelectedModel(parsedModel);

        if (parsedModel.requiresReview) {
          setToast({
            type: "info",
            message:
              "The browser preview is unavailable; secure server analysis will determine printability and pricing.",
          });
        } else if (!hasUserSelectedMaterial) {
          const suggestedMaterial =
            getMaterialById(parsedModel.suggestedMaterialId, materials) ??
            materials[0];
          if (!suggestedMaterial) {
            throw new Error(
              "No printable material is available for this model.",
            );
          }
          setConfig((current) => ({
            ...current,
            materialId: suggestedMaterial.id,
            color: suggestedMaterial.colors[0]?.name ?? current.color,
          }));
          setToast({
            type: "info",
            message: `Suggested material: ${suggestedMaterial.name} based on your model size.`,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not process the uploaded model.";
        setSelectedModel(null);
        setUploadState({
          status: "error",
          progress: 0,
          error: message,
        });
        setFileError(message);
        setToast({ type: "error", message });
      } finally {
        setViewerLoading(false);
      }
    },
    [hasUserSelectedMaterial, materials, supabaseEnabled, user],
  );

  useEffect(() => {
    if (
      !initialModelFile ||
      prefilledModelRef.current ||
      !user ||
      !supabaseEnabled
    ) {
      return;
    }

    prefilledModelRef.current = true;

    const loadInitialModel = async () => {
      try {
        const storagePath = getModelStoragePath(initialModelFile.fileUrl);
        if (!storagePath) {
          throw new Error("Could not load the selected model file.");
        }

        const signedUrl = await getSignedModelUrl(storagePath);
        const response = await fetch(signedUrl);
        if (!response.ok) {
          throw new Error("Could not fetch the selected model file.");
        }
        const blob = await response.blob();
        const file = new File([blob], initialModelFile.fileName, {
          type: blob.type || "application/octet-stream",
        });

        await handleFileSelect(file);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load the selected model file.";
        setToast({ type: "error", message });
      }
    };

    void loadInitialModel();
  }, [handleFileSelect, initialModelFile, supabaseEnabled, user]);

  const handleMaterialChange = (materialId: string) => {
    const nextMaterial = getMaterialById(materialId, materials) ?? materials[0];
    if (!nextMaterial) {
      return;
    }
    setHasUserSelectedMaterial(true);
    setConfig((current) => ({
      ...current,
      materialId,
      color: nextMaterial.colors[0]?.name ?? current.color,
    }));
  };

  const handleSaveQuote = async () => {
    if (!supabaseEnabled) {
      setToast({
        type: "error",
        message:
          "Supabase is not configured. Local preview works, but account save is unavailable.",
      });
      return;
    }

    if (!user) {
      setToast({
        type: "error",
        message: "Sign in to save this quote to your account.",
      });
      return;
    }

    if (!analysis?.quote) {
      setToast({
        type: "error",
        message: "Wait for authoritative slicing to finish before saving.",
      });
      return;
    }

    setSavingQuote(true);
    setToast({
      type: "success",
      message: "This authoritative quote is already saved to your account.",
    });
    setSavingQuote(false);
  };

  const cartItemCheck = isInCart(initialQuoteId);

  const handleAddToCart = () => {
    if (
      !priceBreakdown ||
      !selectedModel ||
      !selectedMaterial ||
      !initialQuoteId ||
      !analysis?.quote
    ) {
      if (selectedModel?.requiresReview) {
        setToast({
          type: "error",
          message:
            "Models requiring manual review cannot be auto-quoted. Please use the contact form for a custom quote.",
        });
        return;
      }
      setToast({
        type: "error",
        message: "Upload a model and generate a quote before adding to cart.",
      });
      return;
    }

    if (!uploadState.path) {
      setToast({
        type: "error",
        message:
          "Sign in and upload the model to storage before adding this quote to cart.",
      });
      return;
    }

    const cartItem: CartItem = {
      id: initialQuoteId,
      name: selectedModel?.fileName ?? "model",
      quoteId: initialQuoteId,
      quoteVersionId: analysis.quote.quoteVersionId,
      fileUrl: uploadState.path,
      fileName: selectedModel?.fileName ?? "model",
      material: selectedMaterial.name,
      color: selectedColorName ?? "",
      infill: config.infill,
      layerHeight: config.layerHeight,
      quantity: config.quantity,
      supports: config.supports,
      materialCost: priceBreakdown?.materialCost ?? 0,
      machineCost: priceBreakdown?.machineCost ?? 0,
      subtotal: priceBreakdown?.subtotal ?? 0,
      postProcessingCharges: priceBreakdown?.postProcessingCharges ?? 0,
      overheadPercentage: priceBreakdown?.overheadPercentage ?? 0,
      overheadAmount: priceBreakdown?.overheadAmount ?? 0,
      marginPercentage: priceBreakdown?.marginPercentage ?? 0,
      marginAmount: priceBreakdown?.marginAmount ?? 0,
      totalPrice: priceBreakdown?.priceBeforeDiscount ?? 0,
      cartDiscountAmount: priceBreakdown?.cartDiscountAmount ?? 0,
      cartDiscountPercent: priceBreakdown?.cartDiscountPercent ?? 0,
      finalPrice: priceBreakdown?.finalPrice ?? 0,
      deliveryCharge: priceBreakdown?.deliveryCharge ?? 0,
      grandTotal: priceBreakdown?.grandTotal ?? 0,
      price: priceBreakdown?.finalPrice ?? 0,
      estimatedTime: priceBreakdown?.estimatedHours ?? 0,
      weight: priceBreakdown?.materialWeightGrams ?? 0,
      modelVolumeMm3: selectedModel?.volumeMm3 ?? 0,
      difficultyFactor:
        priceBreakdown?.difficultyFactor ?? selectedMaterial.difficultyFactor,
      dimensions: priceBreakdown?.dimensionsMm ?? { x: 0, y: 0, z: 0 },
      config: {
        materialId: selectedMaterial.id,
        color: selectedColorName ?? "",
        infill: config.infill,
        layerHeight: config.layerHeight,
        quantity: config.quantity,
        postProcessingLevel: config.postProcessingLevel,
        supports: config.supports,
      },
      addedAt: new Date().toISOString(),
    };

    addItem(cartItem);
    setToast({
      type: "success",
      message: `${selectedModel.fileName} added to cart.`,
    });
  };

  const handleStepClick = (ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getStepDone = (stepId: string) => {
    switch (stepId) {
      case "upload":
        return uploadState.status === "success";
      case "viewer":
        return selectedModel !== null;
      case "material":
        return selectedModel !== null;
      case "settings":
        return false;
      default:
        return false;
    }
  };

  const stepConfigs = [
    { id: "upload", label: "Upload" },
    { id: "viewer", label: "Preview" },
    { id: "material", label: "Configure" },
    { id: "settings", label: "Settings" },
  ];

  const stepRefs = {
    upload: uploadRef,
    viewer: viewerRef,
    material: materialRef,
    settings: settingsRef,
  };
  const whatsappDigits = bulkOrderContact.whatsappNumber.replace(/[^0-9]/g, "");

  return (
    <>
      <div className="instant-quote-workspace relative min-h-screen overflow-hidden">
        <div className="quote-premium-grid" aria-hidden="true" />
        <div className="quote-premium-beam" aria-hidden="true" />
        <div className="quote-premium-frame" aria-hidden="true" />
        <motion.div
          aria-hidden
          animate={
            shouldReduceMotion ? undefined : { x: [0, 50, 0], y: [0, -20, 0] }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 16, repeat: Infinity, ease: "easeInOut" }
          }
          className="quote-orb quote-orb-left pointer-events-none absolute left-[-8rem] top-28 h-72 w-72 rounded-full bg-[#6d28d9]/8 blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={
            shouldReduceMotion ? undefined : { x: [0, -45, 0], y: [0, 25, 0] }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 18, repeat: Infinity, ease: "easeInOut" }
          }
          className="quote-orb quote-orb-right pointer-events-none absolute right-[-7rem] top-36 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl"
        />

        {/* Header */}
        <div className="quote-hero relative px-4 pb-6 pt-8 md:px-8 md:pt-10 xl:px-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="quote-hero-kicker inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/25 bg-[#6d28d9]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#6d28d9]">
                  Instant Pricing Experience
                </div>
                <h1 className="quote-hero-title mt-4 font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3.2rem)] font-extrabold leading-[0.98] tracking-[-2px] text-[#070b1d]">
                  Get Your{" "}
                  <span className="quote-title-accent text-[#6d28d9]">
                    Instant Quote
                  </span>
                </h1>
                <p className="quote-hero-copy mt-3 max-w-[600px] text-sm leading-7 text-[#6F7192]">
                  Upload, preview, configure, and get pricing in one streamlined
                  workflow.
                </p>
              </div>

              {/* Step Navigator */}
              <div className="quote-step-nav flex items-center gap-1 overflow-x-auto rounded-2xl border border-[#6d28d9]/10 bg-white p-1.5 shadow-sm scrollbar-hide">
                {stepConfigs.map((step, i) => {
                  const done = getStepDone(step.id);
                  const ref = stepRefs[step.id as keyof typeof stepRefs];
                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(ref)}
                      className={`quote-step-button ${done ? "quote-step-button-done" : ""} flex min-h-[44px] flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2.5 text-xs font-medium transition-colors hover:bg-gray-100`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                          done
                            ? "bg-emerald-700/20 text-emerald-700"
                            : "bg-white text-[#6F7192]"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span
                        className={done ? "text-emerald-700" : "text-[#6F7192]"}
                      >
                        {step.label}
                      </span>
                      {i < stepConfigs.length - 1 && (
                        <ArrowRight className="ml-1 h-3 w-3 text-[#070b1d]/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 pb-16 md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="quote-layout-grid grid gap-6 lg:gap-8 xl:grid-cols-[1fr_380px]">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="quote-bulk-strip rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-sm text-[#070b1d]">
                  For bulk orders contact{" "}
                  <a
                    className="font-medium text-[#6d28d9] hover:underline"
                    href={`mailto:${bulkOrderContact.email}`}
                  >
                    {bulkOrderContact.email}
                  </a>{" "}
                  or{" "}
                  <a
                    className="font-medium text-[#6d28d9] hover:underline"
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp us
                  </a>
                  .
                </div>

                {/* Upload Section */}
                <motion.div
                  ref={uploadRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                >
                  <div className="quote-premium-card quote-upload-card rounded-[24px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 sm:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="quote-section-icon rounded-xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 p-2.5 text-[#6d28d9]">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#070b1d]">
                          1. Upload Your Model
                        </h2>
                        <p className="text-xs text-[#6F7192]">
                          STL, OBJ, 3MF, GLB, GLTF, FBX, PLY, DAE, AMF, STEP,
                          IGES, BREP, DWG, DXF supported
                        </p>
                      </div>
                    </div>

                    <div
                      className="quote-upload-dropzone relative flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-[#6d28d9]/10 bg-white p-6 text-center transition-colors hover:border-[#6d28d9]/30"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const files = e.dataTransfer.files;
                        if (files[0]) handleFileSelect(files[0]);
                      }}
                    >
                      <input
                        type="file"
                        accept=".stl,.obj,.3mf,.glb,.gltf,.fbx,.ply,.dae,.amf,.step,.stp,.iges,.igs,.brep,.dwg,.dxf"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            handleFileSelect(e.target.files[0]);
                        }}
                      />
                      <div>
                        <motion.div
                          animate={
                            shouldReduceMotion ? undefined : { y: [0, -4, 0] }
                          }
                          transition={
                            shouldReduceMotion
                              ? undefined
                              : {
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }
                          }
                          className="quote-upload-icon mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#6d28d9]/25 bg-[#6d28d9]/12 text-[#6d28d9]"
                        >
                          <UploadCloud className="h-6 w-6" />
                        </motion.div>
                        <div className="text-base font-semibold text-[#070b1d]">
                          {selectedFile
                            ? selectedFile.name
                            : "Drop your file or click to browse"}
                        </div>
                        {!selectedFile && (
                          <div className="mt-2 text-xs text-[#6F7192]">
                            STL · OBJ · 3MF · GLB · GLTF · FBX · PLY · DAE · AMF
                            · STEP · IGES · BREP · DWG · DXF
                          </div>
                        )}
                        {selectedFile && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#6d28d9]/10 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">
                            <FileArchive className="h-3 w-3" />
                            {selectedFile.name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {uploadState.status === "uploading" && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs text-[#6F7192]">
                          <span className="inline-flex items-center gap-1.5">
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            Uploading...
                          </span>
                          <span>{uploadState.progress}%</span>
                        </div>
                        <div className="quote-progress-track h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="quote-progress-fill h-full rounded-full bg-[#6d28d9] transition-all duration-300"
                            style={{ width: `${uploadState.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {uploadState.status === "success" && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Upload complete
                      </div>
                    )}
                    {analysis && (
                      <div className="mt-4 rounded-xl border border-[#6d28d9]/15 bg-[#6d28d9]/5 p-3">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="inline-flex items-center gap-2 font-medium text-[#070b1d]">
                            {!['ready', 'manual_review', 'failed'].includes(analysis.status) && (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#6d28d9]" />
                            )}
                            {analysis.status === 'uploaded' && 'Preparing analysis'}
                            {analysis.status === 'queued' && 'Queued for secure processing'}
                            {analysis.status === 'converting' && 'Converting geometry'}
                            {analysis.status === 'validating' && 'Validating printability'}
                            {analysis.status === 'orienting' && 'Optimizing orientation'}
                            {analysis.status === 'slicing' && 'Slicing on Bambu Lab A1'}
                            {analysis.status === 'ready' && (analysis.quote ? 'Authoritative quote ready' : 'Geometry verified')}
                            {analysis.status === 'manual_review' && 'Manual review required'}
                            {analysis.status === 'failed' && 'Analysis failed'}
                          </span>
                          <span className="tabular-nums text-[#6F7192]">{analysis.progress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-[#6d28d9] transition-all duration-500"
                            style={{ width: `${analysis.progress}%` }}
                          />
                        </div>
                        {analysis.requiresUnitConfirmation && !unitConfirmed && (
                          <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-900">
                            <p>STL, OBJ, and PLY do not declare units. Confirm that the displayed dimensions use millimetres before slicing.</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label htmlFor="model-unit" className="font-semibold">
                                Source unit
                              </label>
                              <select
                                id="model-unit"
                                value={unitChoice}
                                onChange={(event) =>
                                  setUnitChoice(
                                    event.target.value as "mm" | "cm" | "m" | "in" | "ft",
                                  )
                                }
                                className="rounded-lg border border-amber-300 bg-white px-2 py-2 text-amber-950"
                              >
                                <option value="mm">Millimetres</option>
                                <option value="cm">Centimetres</option>
                                <option value="m">Metres</option>
                                <option value="in">Inches</option>
                                <option value="ft">Feet</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => void confirmUnitScale()}
                                className="rounded-lg bg-amber-900 px-3 py-2 font-semibold text-white"
                              >
                                Confirm scale
                              </button>
                            </div>
                          </div>
                        )}
                        {analysis.failure?.message && (
                          <p className="mt-2 text-xs text-amber-800">{analysis.failure.message}</p>
                        )}
                      </div>
                    )}
                    {uploadState.status === "error" && uploadState.error && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-rose-600">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {uploadState.error}
                      </div>
                    )}
                    {fileError && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {fileError}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Viewer Section */}
                <motion.div
                  ref={viewerRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <ViewerSection
                    model={selectedModel}
                    isLoading={viewerLoading}
                    materialId={config.materialId}
                    colorName={config.color}
                  />
                </motion.div>

                {/* Material & Color Section */}
                <motion.div
                  ref={materialRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <div className="quote-premium-card quote-material-card rounded-[24px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 sm:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="quote-section-icon rounded-xl border border-violet-400/20 bg-violet-400/10 p-2.5 text-violet-200">
                        <Palette className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#070b1d]">
                          3. Material & Color
                        </h2>
                        <p className="text-xs text-[#6F7192]">
                          Choose the best material and finish for your part
                        </p>
                      </div>
                    </div>

                    {/* Material Selection */}
                    <div className="mb-5">
                      <label className="mb-2 block text-xs font-medium text-[#6F7192]">
                        Material
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {materials.map((material) => {
                          const isActive = material.id === config.materialId;
                          return (
                            <button
                              key={material.id}
                              type="button"
                              onClick={() => handleMaterialChange(material.id)}
                              className={`quote-option-card ${isActive ? "quote-option-card-active" : ""} flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                isActive
                                  ? "border-[#6d28d9]/35 bg-[var(--brand-faint)] shadow-[0_4px_16px_rgba(109, 40, 217,0.1)]"
                                  : "border-[#6d28d9]/10 bg-white hover:border-[#6d28d9]/10"
                              }`}
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-base">
                                {material.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`truncate text-sm font-medium ${isActive ? "text-[var(--brand-primary)]" : "text-[#070b1d]"}`}
                                  >
                                    {material.name}
                                  </span>
                                  {isActive && (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6d28d9]" />
                                  )}
                                </div>
                                <p
                                  className={`mt-0.5 truncate text-[11px] ${isActive ? "text-[var(--text-secondary)]" : "text-[#6F7192]"}`}
                                >
                                  {material.summary}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#6F7192]">
                        Color — {selectedMaterial?.name ?? "Material"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(selectedMaterial?.colors ?? []).map((color, idx) => {
                          const isActive = color.name === config.color;
                          return (
                            <button
                              key={`${color.name}-${idx}`}
                              type="button"
                              onClick={() =>
                                setConfig((c) => ({ ...c, color: color.name }))
                              }
                              className={`quote-option-card ${isActive ? "quote-option-card-active" : ""} flex min-h-11 items-center gap-2 rounded-xl border px-4 text-left transition-all ${
                                isActive
                                  ? "border-[#6d28d9]/40 bg-[var(--brand-faint)]"
                                  : "border-[#6d28d9]/10 bg-white hover:border-[#6d28d9]/10"
                              }`}
                            >
                              <span
                                className={`text-xs font-medium ${isActive ? "text-[var(--brand-primary)]" : "text-[#070b1d]"}`}
                              >
                                {color.name}
                              </span>
                              {isActive && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#6d28d9]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Settings Section */}
                <motion.div
                  ref={settingsRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="quote-premium-card quote-settings-card rounded-[24px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 sm:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="quote-section-icon rounded-xl border border-sky-400/20 bg-sky-50 p-2.5 text-sky-700">
                        <Layers3 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#070b1d]">
                          4. Print Settings
                        </h2>
                        <p className="text-xs text-[#6F7192]">
                          Fine-tune quality, strength, and scale
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Infill */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-[#6F7192]">Infill Density</span>
                          <span className="font-semibold text-[#070b1d]">
                            {config.infill}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={100}
                          step={5}
                          value={config.infill}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              infill: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#6d28d9]"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-[#6F7192]">
                          <span>Hollow</span>
                          <span>Solid</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-[#6F7192]">Quantity</span>
                          <span className="font-semibold text-[#070b1d]">
                            {config.quantity} pcs
                          </span>
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          step={1}
                          value={config.quantity}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              quantity: Math.max(
                                1,
                                Math.floor(Number(e.target.value) || 1),
                              ),
                            }))
                          }
                          className="w-full rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-3 text-sm text-[#070b1d] outline-none"
                        />
                      </div>

                      {/* Post-processing */}
                      <div>
                        <div className="mb-2 text-sm text-[#6F7192]">
                          Post-processing
                        </div>
                        <div className="grid gap-2">
                          {postProcessingOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setConfig((c) => ({
                                  ...c,
                                  postProcessingLevel: option.value,
                                }))
                              }
                              className={`quote-option-card ${option.value === config.postProcessingLevel ? "quote-option-card-active" : ""} min-h-11 rounded-xl border px-3 text-left transition-all ${
                                option.value === config.postProcessingLevel
                                  ? "border-[#6d28d9]/35 bg-[var(--brand-faint)]"
                                  : "border-[#6d28d9]/10 bg-white hover:border-[#6d28d9]/10"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div
                                  className={`text-xs font-medium ${option.value === config.postProcessingLevel ? "text-[var(--brand-primary)]" : "text-[#070b1d]"}`}
                                >
                                  {option.label}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6d28d9]">
                                  {priceBreakdown
                                    ? `₹${getPostProcessingCharge(
                                        option.value,
                                        postProcessingBaseAmount,
                                        selectedMaterial?.difficultyFactor ?? 0,
                                        pricingSettings.postProcessingMultipliers,
                                      ).toFixed(2)}`
                                    : "—"}
                                </div>
                              </div>
                              <div
                                className={`mt-0.5 text-[10px] ${option.value === config.postProcessingLevel ? "text-[var(--text-secondary)]" : "text-[#6F7192]"}`}
                              >
                                {option.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Layer Height */}
                      <div>
                        <div className="mb-2 text-sm text-[#6F7192]">
                          Layer Height
                        </div>
                        <div className="grid gap-2">
                          {layerHeightOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setConfig((c) => ({
                                  ...c,
                                  layerHeight: option.value,
                                }))
                              }
                              className={`quote-option-card ${option.value === config.layerHeight ? "quote-option-card-active" : ""} min-h-11 rounded-xl border px-3 text-left transition-all ${
                                option.value === config.layerHeight
                                  ? "border-[#6d28d9]/35 bg-[var(--brand-faint)]"
                                  : "border-[#6d28d9]/10 bg-white hover:border-[#6d28d9]/10"
                              }`}
                            >
                              <div
                                className={`text-xs font-medium ${option.value === config.layerHeight ? "text-[var(--brand-primary)]" : "text-[#070b1d]"}`}
                              >
                                {option.label}
                              </div>
                              <div
                                className={`mt-0.5 text-[10px] ${option.value === config.layerHeight ? "text-[var(--text-secondary)]" : "text-[#6F7192]"}`}
                              >
                                {option.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Save Quote */}
                    {user && (
                      <div className="quote-save-strip mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-[#6d28d9]/10 bg-white p-4 sm:flex-row">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-emerald-700" />
                          <div>
                            <div className="text-xs font-medium text-[#070b1d]">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-[#6F7192]">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveQuote}
                          disabled={
                            !selectedModel ||
                            !analysis?.quote ||
                            savingQuote ||
                            uploadState.status === "uploading"
                          }
                          className="quote-secondary-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 text-xs font-medium text-[#070b1d] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          {savingQuote ? "Saving..." : "Save Quote"}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Right Sidebar - Sticky Quote Summary */}
              <motion.aside
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="quote-summary-shell xl:sticky xl:top-24 xl:self-start"
              >
                <div className="quote-summary-card rounded-[24px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.96))] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.2)] sm:p-6 sm:shadow-[0_18px_70px_rgba(0,0,0,0.3)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#070b1d]">
                        Quote Summary
                      </h2>
                      <p className="text-xs text-[#6F7192]">{initialQuoteId}</p>
                    </div>
                    <div className="rounded-xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 p-2 text-[#6d28d9]">
                      <Package2 className="h-4 w-4" />
                    </div>
                  </div>

                  {!priceBreakdown && preliminaryEstimate ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                          Preliminary estimate · not a checkout quote
                        </div>
                        <div className="mt-1 font-[var(--font-syne)] text-3xl font-bold text-[#070b1d]">
                          ₹{preliminaryEstimate.grandTotal.toFixed(0)}
                        </div>
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-white/75 px-3 py-2 text-xs text-[#070b1d]">
                          <span>Estimated filament · {config.quantity} pcs</span>
                          <span className="font-semibold tabular-nums">
                            {preliminaryEstimate.materialWeightGrams.toFixed(1)} g
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-amber-900">
                          About {preliminaryEstimate.materialUsageGramsPerUnit.toFixed(1)} g per piece, including estimated supports when selected.
                        </p>
                        <p className="mt-2 text-xs leading-5 text-amber-900">
                          Estimated from model volume, material density, shell thickness, infill, and selected supports. Actual use can change after slicing and review; purge and printer waste are not included.
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#6d28d9]/10 bg-white p-4 text-sm text-[#6F7192]">
                        {analysis?.status === "manual_review" ? (
                          <>
                            <div className="font-medium text-amber-800">Manual review required</div>
                            <p className="mt-1 text-xs leading-5">
                              {analysis.failure?.message ??
                                "We’ll confirm the final price after reviewing this model."}
                            </p>
                          </>
                        ) : analysis?.status === "failed" ? (
                          <>
                            <div className="font-medium text-rose-700">Server analysis failed</div>
                            <p className="mt-1 text-xs leading-5">
                              {analysis.failure?.message ??
                                "This estimate is for planning only. Contact us to confirm the final price."}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-[#070b1d]">Final price pending slicing</div>
                            <p className="mt-1 text-xs leading-5">
                              Checkout unlocks after a server-side quote is ready.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : !priceBreakdown ? (
                    <div className="rounded-xl border border-[#6d28d9]/10 bg-white p-4 text-sm text-[#6F7192]">
                      {analysis?.status === "manual_review" ? (
                        <>
                          <div className="font-medium text-amber-800">Manual review required</div>
                          <p className="mt-1 text-xs leading-5">
                            {analysis.failure?.message ??
                              "This model cannot receive an automatic price yet."}
                          </p>
                        </>
                      ) : analysis?.status === "failed" ? (
                        <>
                          <div className="font-medium text-rose-700">Analysis failed</div>
                          <p className="mt-1 text-xs leading-5">
                            {analysis.failure?.message ??
                              "We could not analyse this model. Please try another export."}
                          </p>
                        </>
                      ) : analysis ? (
                        <>
                          <div className="font-medium text-[#070b1d]">Calculating authoritative price…</div>
                          <p className="mt-1 text-xs leading-5">
                            The model is being validated and sliced on the configured printer. The price will appear when slicing completes.
                          </p>
                        </>
                      ) : !user ? (
                        <>
                          <div className="font-medium text-[#070b1d]">Sign in to calculate your price</div>
                          <p className="mt-1 text-xs leading-5">
                            Uploading a model anonymously only enables a local preview. Sign in to run the authoritative server analysis.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-[#070b1d]">Upload a model to calculate your price</div>
                          <p className="mt-1 text-xs leading-5">
                            Your price will be calculated from the server-side slicing result, not browser estimates.
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Config Summary */}
                      <div className="quote-config-pill mb-4 rounded-xl border border-[#6d28d9]/10 bg-white p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#070b1d]">
                            {selectedMaterial?.name ?? "Material"}
                          </span>
                          <span className="text-[#6F7192]">·</span>
                          <span className="text-[#6F7192]">
                            {config.infill}% infill
                          </span>
                          <span className="text-[#6F7192]">·</span>
                          <span className="text-[#6F7192]">
                            {config.layerHeight}mm
                          </span>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="quote-total-card rounded-xl border border-[#6d28d9]/20 bg-[linear-gradient(180deg,rgba(109,40,217,0.12),rgba(109,40,217,0.06))] p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[#6F7192]">
                          Total Price
                        </div>
                        <div className="mt-1 font-[var(--font-syne)] text-3xl font-bold text-[#070b1d]">
                          ₹{priceBreakdown.priceBeforeDiscount.toFixed(0)}
                        </div>
                        <div className="mt-3 space-y-1.5 text-xs text-[#6F7192]">
                          <div className="flex justify-between">
                            <span>Quantity</span>
                            <span>{priceBreakdown.quantity} pcs</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Material usage</span>
                            <span>
                              {priceBreakdown.materialWeightGrams.toFixed(2)} g
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Material cost</span>
                            <span>
                              ₹{priceBreakdown.materialCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Machine time</span>
                            <span>
                              {formatDurationMinutes(
                                priceBreakdown.estimatedMinutes,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Machine cost</span>
                            <span>
                              ₹{priceBreakdown.machineCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Post-processing</span>
                            <span>
                              ₹{priceBreakdown.postProcessingCharges.toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t border-[#6d28d9]/10 pt-1.5 flex justify-between font-medium text-[#070b1d]">
                            <span>Production cost</span>
                            <span>₹{priceBreakdown.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>
                              Service fee (
                              {priceBreakdown.overheadPercentage +
                                priceBreakdown.marginPercentage}
                              %)
                            </span>
                            <span>
                              ₹
                              {(
                                priceBreakdown.overheadAmount +
                                priceBreakdown.marginAmount
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cart discount</span>
                            <span>
                              {priceBreakdown.cartDiscountPercent}% ·{" "}
                              {priceBreakdown.cartDiscountAmount > 0 ? "-" : ""}
                              ₹{priceBreakdown.cartDiscountAmount.toFixed(2)}
                            </span>
                          </div>
                          {priceBreakdown.priceBeforeMinimum !==
                            priceBreakdown.finalPrice &&
                            priceBreakdown.minimumOrderValue > 0 && (
                              <div className="flex justify-between">
                                <span>Minimum order value</span>
                                <span className="text-[#070b1d]">
                                  ₹{priceBreakdown.minimumOrderValue.toFixed(2)}
                                </span>
                              </div>
                            )}
                          <div className="border-t border-[#6d28d9]/10 pt-1.5 flex justify-between font-medium text-[#070b1d]">
                            <span>Total price</span>
                            <span>
                              ₹{priceBreakdown.priceBeforeDiscount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Final price</span>
                            <span>₹{priceBreakdown.finalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery</span>
                            <span>
                              {priceBreakdown.deliveryCharge === 0
                                ? "FREE"
                                : `₹${priceBreakdown.deliveryCharge.toFixed(0)}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Grand total</span>
                            <span>₹{priceBreakdown.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="quote-mini-stat rounded-xl border border-[#6d28d9]/10 bg-white p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">
                            Weight
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#070b1d]">
                            {priceBreakdown.materialUsageGramsPerUnit.toFixed(
                              2,
                            )}{" "}
                            g / unit
                          </div>
                        </div>
                        <div className="quote-mini-stat rounded-xl border border-[#6d28d9]/10 bg-white p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">
                            Print time
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#070b1d]">
                            {formatDurationMinutes(
                              priceBreakdown.estimatedMinutes,
                            )}
                          </div>
                        </div>
                        <div className="quote-mini-stat col-span-2 rounded-xl border border-[#6d28d9]/10 bg-white p-3">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">
                            <Cuboid className="h-3 w-3" />
                            Dimensions
                          </div>
                          <div className="mt-1 text-xs text-[#070b1d]">
                            {priceBreakdown.dimensionsMm.x.toFixed(0)} ×{" "}
                            {priceBreakdown.dimensionsMm.y.toFixed(0)} ×{" "}
                            {priceBreakdown.dimensionsMm.z.toFixed(0)} mm
                          </div>
                        </div>
                      </div>

                      {/* Delivery */}
                      <div className="quote-delivery-card mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                          <Truck className="h-3 w-3" />
                          Delivery
                        </div>
                        <div className="mt-1 text-xs font-medium text-[#070b1d]">
                          ~48 hour print and delivery
                        </div>
                        {pricingSettings.gstInclusivePricing && (
                          <div className="mt-1 text-[10px] text-[#6F7192]">
                            Prices inclusive of all applicable taxes
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-5 space-y-2.5">
                        {analysis?.status === "manual_review" ? (
                          <div className="quote-primary-action flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-800">
                            <AlertTriangle className="h-4 w-4" />
                            Manual review required — contact for custom quote
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={
                              !selectedModel ||
                              !analysis?.quote ||
                              uploadState.status === "uploading"
                            }
                            className={`quote-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                              cartItemCheck
                                ? "border border-emerald-700/30 bg-emerald-700/10 text-emerald-700"
                                : "bg-[#6d28d9] text-white hover:opacity-95"
                            }`}
                          >
                            {cartItemCheck ? (
                              <>
                                <PackageCheck className="h-4 w-4" />
                                Added to Cart
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4" />
                                Add to Cart
                              </>
                            )}
                          </button>
                        )}

                        {cartItemCheck && (
                          <Link
                            href="/cart"
                            className="quote-secondary-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#6d28d9]/30 bg-[#6d28d9]/10 px-4 text-xs font-medium text-[#6d28d9] transition-colors hover:bg-[#6d28d9]/20"
                          >
                            View Cart
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>

                      {!user && (
                        <Link
                          href="/login?next=%2Finstant-quote"
                          className="quote-secondary-action mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 text-xs font-medium text-[#070b1d] transition-colors hover:bg-purple-50"
                        >
                          Sign in to save quotes
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </motion.aside>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}
