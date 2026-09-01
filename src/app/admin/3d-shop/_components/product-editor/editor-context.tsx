"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import type {
  ShopCategory,
  ShopProduct,
  ShopSku,
  ShopSkuImage,
  ShopSkuPricingRule,
  ShopSkuTierPrice,
  SkuPatternTemplate,
  ShopVariantOption,
  ShopVariantOptionDimension,
  ShopVariantOptionImage,
  ProductDimensions,
  VariantValueMetadata,
} from "@/lib/shop/admin-types";
import { slugifyShopValue, stableStringify } from "@/lib/shop/admin-types";
import {
  buildSkuRows,
  isDiscreteOptionType,
  type SkuDraftRow,
  type SkuPatternOption,
} from "@/lib/shop/sku-engine";
import type { ProductForm, ProductFormErrors } from "@/lib/shop/product-schema";
import { getPublishBlockers } from "@/lib/shop/product-schema";
import { skuLabel } from "@/lib/shop/media-pool";
import type { AiGenerationKind, AiGenerateResult, AiTone } from "@/lib/shop/ai";
import type { DescriptionBlocks } from "@/lib/shop/blocks";
import {
  uploadFileWithProgress,
  uploadFormFileWithProgress,
  uploadModelFileWithProgress,
  validateImageFile,
  type ModelUploadKind,
} from "@/lib/shop/upload";
import type { ProductTemplate } from "@/lib/shop/templates";
import { templateLongDescription } from "@/lib/shop/templates";
import { convertRichHtmlToBlocks } from "@/lib/shop/html-to-blocks";
import {
  addRevision,
  clearRevisions,
  loadRevisions,
  type ShopRevision,
} from "@/lib/shop/revisions";
import type { AdminToastState } from "@/components/admin/AdminToast";
import { useProductForm, type EditorExtras } from "./useProductForm";
import {
  type DraftSku,
  type DraftVariant,
  type SaveStatus,
  type UploadState,
  buildProductPayload,
  emptyProduct,
  toProductForm,
} from "./types";

const AUTOSAVE_DELAY = 2000;
const MAX_GALLERY_IMAGES = 40;

type SlugStatus = "idle" | "checking" | "available" | "taken";

type ProductEditorContextValue = {
  mode: "new" | "edit";
  productId?: string;
  product: ProductForm;
  errors: ProductFormErrors;
  touched: Set<string>;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  categories: ShopCategory[];
  slugStatus: SlugStatus;
  uploadState: UploadState;
  variants: DraftVariant[];
  skus: DraftSku[];
  variantDimensions: ShopVariantOptionDimension[];
  variantOptionImages: ShopVariantOptionImage[];
  skuImages: Record<string, ShopSkuImage[]>;
  defaultWeight: string;
  defaultCost: string;
  defaultCompareAt: string;
  skuSectionRef: RefObject<HTMLDivElement | null>;
  dragImage: string | null;
  dragVariant: string | null;
  toast: AdminToastState;
  publishBlockers: string[];
  aiTone: AiTone;
  aiBusy: Partial<Record<AiGenerationKind, boolean>>;

  updateProduct: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
  markTouched: (key: keyof ProductForm) => void;
  undo: () => void;
  redo: () => void;
  markSlugTouched: () => void;
  saveProduct: (status?: SaveStatus) => Promise<void>;
  archiveProduct: () => Promise<void>;
  setToast: (toast: AdminToastState) => void;
  setDragImage: (value: string | null) => void;
  setDragVariant: (value: string | null) => void;
  setAiTone: (tone: AiTone) => void;
  generateAi: (kind: AiGenerationKind) => Promise<void>;
  generateAiField: (fieldContext: string, draftText: string) => Promise<string>;
  generateAiSpecsRows: (draftText: string) => Promise<{ label: string; value: string }[]>;
  setDefaultWeight: (value: string) => void;
  setDefaultCost: (value: string) => void;
  setDefaultCompareAt: (value: string) => void;
  applyTemplate: (template: ProductTemplate) => Promise<void>;
  duplicateProduct: () => Promise<void>;
  revisions: ShopRevision[];
  restoreRevision: (timestamp: number) => Promise<void>;
  clearRevisionHistory: () => void;

  uploadImage: (
    file: File,
    target?: "gallery" | "variant",
    skuId?: string,
    onProgress?: (progress: number) => void,
  ) => Promise<string | void>;
  uploadBlockImage: (file: File) => Promise<string>;
  uploadModel: (file: File) => Promise<void>;
  removeModel: () => void;
  uploadProductAsset: (
    file: File,
    kind: ModelUploadKind,
    field: "model_url" | "usdz_url" | "hero_video_url",
  ) => Promise<void>;
  removeProductAsset: (
    field: "model_url" | "usdz_url" | "hero_video_url",
  ) => void;
  uploadSkuModel: (skuId: string, file: File) => Promise<void>;
  setThumbnail: (url: string) => void;
  removeImage: (url: string) => Promise<void>;
  handleImageDrop: (url: string) => void;
  setImageAlt: (url: string, alt: string) => void;
  uploadLandscapeImage: (
    file: File,
    onProgress?: (progress: number) => void,
  ) => Promise<string | void>;
  removeLandscapeImage: () => void;
  attachLibraryImage: (url: string) => void;
  assignToVariantOption: (
    url: string,
    optionName: string,
    optionValue: string,
  ) => Promise<void>;
  unassignVariantOptionImage: (imageId: string) => Promise<void>;
  assignToSku: (url: string, skuId: string) => Promise<void>;
  unassignSkuImage: (imageId: string) => Promise<void>;
  clearSkuVariantImage: (skuId: string) => Promise<void>;
  generateImageAlt: (url: string) => Promise<string>;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;

  addVariant: () => Promise<ShopVariantOption | null>;
  updateVariant: <K extends keyof ShopVariantOption>(
    variantId: string,
    key: K,
    value: ShopVariantOption[K],
  ) => void;
  deleteVariant: (variant: DraftVariant) => Promise<void>;
  reorderVariants: (targetId: string) => Promise<void>;
  updateVariantValueMetadata: (
    variantId: string,
    value: string,
    patch: Partial<VariantValueMetadata>,
  ) => void;
  removeVariantValue: (variantId: string, value: string) => void;
  reorderVariantValues: (variantId: string, orderedValues: string[]) => void;

  pricingRules: ShopSkuPricingRule[];
  addPricingRule: (
    rule: Omit<
      ShopSkuPricingRule,
      "id" | "product_id" | "created_at" | "updated_at"
    >,
  ) => Promise<void>;
  updatePricingRule: (
    ruleId: string,
    patch: Partial<ShopSkuPricingRule>,
  ) => Promise<void>;
  deletePricingRule: (ruleId: string) => Promise<void>;

  skuPatternTemplates: SkuPatternTemplate[];
  generateSkuPreview: () => Promise<SkuDraftRow[]>;
  generateSkus: (rows?: SkuDraftRow[]) => Promise<void>;

  tierPrices: Record<string, ShopSkuTierPrice[]>;
  updateTierPrices: (
    skuId: string,
    prices: { tier_name: string; price: number }[],
  ) => Promise<void>;
  generateSkuQr: (skuId: string) => Promise<string | null>;

  updateSku: <K extends keyof ShopSku>(
    skuId: string,
    key: K,
    value: ShopSku[K],
  ) => void;
  bulkUpdateSkus: (partial: Partial<ShopSku>, ids?: string[]) => void;
  saveAllSkus: () => Promise<void>;
  deleteSku: (skuId: string) => Promise<void>;

  updateVariantDimension: (
    optionName: string,
    optionValue: string,
    dimensions: ProductDimensions,
  ) => void;
  deleteVariantDimension: (dimensionId: string) => Promise<void>;
  applyDefaultDimensionsToUnset: () => void;
  addVariantOptionImage: (
    optionName: string,
    optionValue: string,
    file: File,
  ) => Promise<void>;
  updateVariantOptionImage: (
    imageId: string,
    patch: { alt_text?: string; is_primary?: boolean },
  ) => Promise<void>;
  removeVariantOptionImage: (imageId: string) => Promise<void>;
  reorderVariantOptionImages: (
    optionName: string,
    optionValue: string,
    orderedIds: string[],
  ) => Promise<void>;
  addSkuImage: (skuId: string, file: File) => Promise<void>;
  updateSkuImage: (
    imageId: string,
    patch: { alt_text?: string; is_primary?: boolean },
  ) => Promise<void>;
  removeSkuImage: (imageId: string) => Promise<void>;
  reorderSkuImages: (skuId: string, orderedIds: string[]) => Promise<void>;
};

const ProductEditorContext = createContext<ProductEditorContextValue | null>(
  null,
);

export function useProductEditor() {
  const context = useContext(ProductEditorContext);
  if (!context)
    throw new Error(
      "useProductEditor must be used within ProductEditorProvider",
    );
  return context;
}

export function ProductEditorProvider({
  mode,
  productId,
  children,
}: {
  mode: "new" | "edit";
  productId?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [skus, setSkus] = useState<DraftSku[]>([]);
  const [variantDimensions, setVariantDimensions] = useState<
    ShopVariantOptionDimension[]
  >([]);
  const [variantOptionImages, setVariantOptionImages] = useState<
    ShopVariantOptionImage[]
  >([]);
  const [skuImages, setSkuImages] = useState<Record<string, ShopSkuImage[]>>(
    {},
  );
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [uploadState, setUploadState] = useState<UploadState>({});
  const [dragImage, setDragImage] = useState<string | null>(null);
  const [dragVariant, setDragVariant] = useState<string | null>(null);
  const [defaultWeight, setDefaultWeight] = useState("");
  const [defaultCost, setDefaultCost] = useState("");
  const [defaultCompareAt, setDefaultCompareAt] = useState("");
  const [toast, setToast] = useState<AdminToastState>(null);
  const [aiTone, setAiTone] = useState<AiTone>("professional");
  const [aiBusy, setAiBusy] = useState<
    Partial<Record<AiGenerationKind, boolean>>
  >({});
  const [aiPrompt, setAiPrompt] = useState("");
  const [revisions, setRevisions] = useState<ShopRevision[]>([]);
  const [pricingRules, setPricingRules] = useState<ShopSkuPricingRule[]>([]);
  const [skuPatternTemplates, setSkuPatternTemplates] = useState<
    SkuPatternTemplate[]
  >([]);
  const [tierPrices, setTierPrices] = useState<
    Record<string, ShopSkuTierPrice[]>
  >({});
  const skuSectionRef = useRef<HTMLDivElement | null>(null);

  const slugTouchedRef = useRef(mode === "edit");
  const savingRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const variantsRef = useRef<DraftVariant[]>([]);
  const skusRef = useRef<DraftSku[]>([]);
  const variantDimensionsRef = useRef<ShopVariantOptionDimension[]>([]);
  const variantOptionImagesRef = useRef<ShopVariantOptionImage[]>([]);
  const skuImagesRef = useRef<Record<string, ShopSkuImage[]>>({});
  const pricingRulesRef = useRef<ShopSkuPricingRule[]>([]);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    variantsRef.current = variants;
    skusRef.current = skus;
    variantDimensionsRef.current = variantDimensions;
    variantOptionImagesRef.current = variantOptionImages;
    skuImagesRef.current = skuImages;
    pricingRulesRef.current = pricingRules;
  }, [
    variants,
    skus,
    variantDimensions,
    variantOptionImages,
    skuImages,
    pricingRules,
  ]);

  const getEditorExtras = useCallback<() => EditorExtras>(
    () => ({ variants: variantsRef.current, skus: skusRef.current }),
    [],
  );
  const restoreEditorExtras = useCallback((extras: EditorExtras) => {
    setVariants(
      extras.variants.map((variant) => ({ ...variant, dirty: true })),
    );
    setSkus(extras.skus.map((sku) => ({ ...sku, dirty: true })));
  }, []);

  const form = useProductForm(
    emptyProduct,
    getEditorExtras,
    restoreEditorExtras,
  );

  const publishBlockers = getPublishBlockers(form.product);

  const loadVariants = useCallback(async (id: string) => {
    const response = await fetch(`/api/3d-shop/admin/products/${id}/variants`);
    const data = (await response.json()) as { variants?: ShopVariantOption[] };
    setVariants(data.variants ?? []);
  }, []);

  const loadSkus = useCallback(async (id: string) => {
    const response = await fetch(`/api/3d-shop/admin/products/${id}/skus`);
    const data = (await response.json()) as { skus?: ShopSku[] };
    const rows = data.skus ?? [];
    setSkus(rows);
    return rows;
  }, []);

  const loadVariantDimensions = useCallback(async (id: string) => {
    const response = await fetch(
      `/api/3d-shop/admin/products/${id}/variant-dimensions`,
    );
    const data = (await response.json()) as {
      dimensions?: ShopVariantOptionDimension[];
    };
    setVariantDimensions(data.dimensions ?? []);
  }, []);

  const loadVariantOptionImages = useCallback(async (id: string) => {
    const response = await fetch(
      `/api/3d-shop/admin/products/${id}/variant-images`,
    );
    const data = (await response.json()) as {
      images?: ShopVariantOptionImage[];
    };
    setVariantOptionImages(data.images ?? []);
  }, []);

  const loadSkuImages = useCallback(async (skuIds: string[]) => {
    if (skuIds.length === 0) return;
    const params = new URLSearchParams();
    for (const id of skuIds) params.append("sku_ids", id);
    const response = await fetch(
      `/api/3d-shop/admin/skus/images?${params.toString()}`,
    );
    const data = (await response.json()) as {
      images?: Record<string, ShopSkuImage[]>;
    };
    setSkuImages(data.images ?? {});
  }, []);

  const loadPricingRules = useCallback(async (id: string) => {
    const response = await fetch(
      `/api/3d-shop/admin/products/${id}/pricing-rules`,
    );
    const data = (await response.json()) as {
      rules?: ShopSkuPricingRule[];
    };
    setPricingRules(data.rules ?? []);
  }, []);

  const loadSkuPatternTemplates = useCallback(async () => {
    const response = await fetch(`/api/3d-shop/admin/sku-pattern-templates`);
    const data = (await response.json()) as {
      templates?: SkuPatternTemplate[];
    };
    setSkuPatternTemplates(data.templates ?? []);
  }, []);

  const loadTierPrices = useCallback(async (skuIds: string[]) => {
    if (skuIds.length === 0) return;
    const entries: Record<string, ShopSkuTierPrice[]> = {};
    await Promise.all(
      skuIds.map(async (skuId) => {
        const response = await fetch(
          `/api/3d-shop/admin/skus/${skuId}/tier-prices`,
        );
        const data = (await response.json()) as {
          tier_prices?: ShopSkuTierPrice[];
        };
        entries[skuId] = data.tier_prices ?? [];
      }),
    );
    setTierPrices(entries);
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const categoriesResponse = await fetch("/api/3d-shop/admin/categories");
      const categoriesData = (await categoriesResponse.json()) as {
        categories?: ShopCategory[];
      };
      setCategories(categoriesData.categories ?? []);

      if (mode === "edit" && productId) {
        const productResponse = await fetch(
          `/api/3d-shop/admin/products?id=${productId}`,
        );
        const productData = (await productResponse.json()) as {
          product?: ShopProduct;
          error?: string;
        };
        if (!productResponse.ok || !productData.product)
          throw new Error(productData.error || "Product not found.");
        form.reset(toProductForm(productData.product));
        setRevisions(loadRevisions(productId));
        await Promise.all([
          loadVariants(productId),
          loadVariantDimensions(productId),
          loadVariantOptionImages(productId),
          loadPricingRules(productId),
          loadSkuPatternTemplates(),
          loadSkus(productId).then((rows) =>
            Promise.all([
              loadSkuImages(rows.map((sku) => sku.id)),
              loadTierPrices(rows.map((sku) => sku.id)),
            ]),
          ),
        ]);
      } else {
        await loadSkuPatternTemplates();
      }
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to load product.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    form,
    loadSkus,
    loadSkuImages,
    loadVariantDimensions,
    loadVariantOptionImages,
    loadVariants,
    loadPricingRules,
    loadSkuPatternTemplates,
    loadTierPrices,
    mode,
    productId,
  ]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!form.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.dirty]);

  const updateProduct = useCallback(
    <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
      if (key === "name" && !slugTouchedRef.current) {
        form.updateMany({
          name: value as string,
          slug: slugifyShopValue(String(value)),
        });
      } else {
        form.update(key, value);
      }
    },
    [form],
  );

  const checkSlug = useCallback(async (slug: string, id?: string) => {
    if (!slug) return;
    setSlugStatus("checking");
    const params = new URLSearchParams({ slug });
    if (id) params.set("exclude_id", id);
    const response = await fetch(
      `/api/3d-shop/admin/products?${params.toString()}`,
    );
    const data = (await response.json().catch(() => ({}))) as {
      available?: boolean;
    };
    setSlugStatus(data.available ? "available" : "taken");
  }, []);

  const slugCheckTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const slug = form.product.slug;
    if (!slug) return;
    if (slugCheckTimerRef.current)
      window.clearTimeout(slugCheckTimerRef.current);
    slugCheckTimerRef.current = window.setTimeout(() => {
      void checkSlug(slug, form.product.id);
    }, 500);
    return () => {
      if (slugCheckTimerRef.current)
        window.clearTimeout(slugCheckTimerRef.current);
    };
  }, [form.product.slug, form.product.id, checkSlug]);

  const productIdPromiseRef = useRef<Promise<string> | null>(null);

  const ensureProductId = useCallback(async () => {
    const current = form.productRef.current;
    if (current.id) {
      productIdPromiseRef.current = null;
      return current.id;
    }
    // Memoize creation so N parallel uploads share ONE draft POST
    // instead of creating N duplicate draft products.
    if (!productIdPromiseRef.current) {
      productIdPromiseRef.current = (async () => {
        const snapshot = form.productRef.current;
        if (!snapshot.name.trim())
          throw new Error("Add a product name before saving.");
        if (!snapshot.slug.trim())
          throw new Error("Add a product slug before saving.");

        const response = await fetch("/api/3d-shop/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildProductPayload(snapshot, "draft")),
        });
        const data = (await response.json()) as {
          product?: ShopProduct;
          error?: string;
        };
        if (!response.ok || !data.product)
          throw new Error(data.error || "Failed to create product.");

        // Merge the generated id into CURRENT local state (not the server
        // echo) so edits made while the request was in flight survive.
        form.markSaved({ ...form.productRef.current, id: data.product.id });
        slugTouchedRef.current = true;
        setRevisions(loadRevisions(data.product.id));
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            `/admin/3d-shop/products/${data.product.id}/edit`,
          );
        }
        return data.product.id;
      })().catch((error) => {
        productIdPromiseRef.current = null;
        throw error;
      });
    }
    return productIdPromiseRef.current;
  }, [form]);

  const saveAllVariants = useCallback(async () => {
    const id = form.productRef.current.id;
    if (!id) return;
    const dirtyVariants = variantsRef.current.filter(
      (variant) => variant.dirty,
    );
    if (dirtyVariants.length === 0) return;
    await Promise.all(
      dirtyVariants.map(async (variant) => {
        const { dirty: _discard, ...payload } = variant;
        void _discard;
        let response = await fetch(
          `/api/3d-shop/admin/products/${id}/variants`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) {
          response = await fetch(`/api/3d-shop/admin/products/${id}/variants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error || "Failed to save variant option.");
      }),
    );
    setVariants((current) =>
      current.map((variant) => ({ ...variant, dirty: false })),
    );
  }, [form]);

  const saveAllVariantDimensions = useCallback(async () => {
    const id = form.productRef.current.id;
    if (!id) return;
    const entries = variantDimensionsRef.current.map((entry) => ({
      option_name: entry.option_name,
      option_value: entry.option_value,
      dimensions: entry.dimensions,
    }));
    if (entries.length === 0) return;

    const response = await fetch(
      `/api/3d-shop/admin/products/${id}/variant-dimensions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimensions: entries }),
      },
    );
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok)
      throw new Error(data.error || "Failed to save variant dimensions.");
  }, [form]);

  const saveAllSkus = useCallback(async () => {
    const id = form.productRef.current.id;
    if (!id) return;
    const dirtySkus = skusRef.current.filter((sku) => sku.dirty);
    if (dirtySkus.length === 0) return;
    await Promise.all(
      dirtySkus.map(async (sku) => {
        const { dirty: _discard, ...payload } = sku;
        void _discard;
        let response = await fetch(`/api/3d-shop/admin/products/${id}/skus`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          response = await fetch(`/api/3d-shop/admin/products/${id}/skus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ skus: [payload] }),
          });
        }
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "Failed to save SKU.");
      }),
    );
    setSkus((current) => current.map((sku) => ({ ...sku, dirty: false })));
    const availablePrices = skusRef.current
      .filter((sku) => sku.is_available !== false)
      .map((sku) => Number(sku.price))
      .filter(Number.isFinite);
    if (availablePrices.length > 0) {
      form.patchLocal({ base_price: Math.min(...availablePrices) });
    }
  }, [form]);

  const captureRevision = useCallback(
    (productId: string) => {
      const revision: ShopRevision = {
        timestamp: Date.now(),
        product: form.productRef.current,
        variants: variantsRef.current.map((variant) => {
          const { dirty: _discard, ...rest } = variant;
          void _discard;
          return rest;
        }),
        skus: skusRef.current.map((sku) => {
          const { dirty: _discard, ...rest } = sku;
          void _discard;
          return rest;
        }),
        variant_dimensions: variantDimensionsRef.current,
        variant_option_images: variantOptionImagesRef.current,
        sku_images: skuImagesRef.current,
      };
      setRevisions(addRevision(productId, revision));
    },
    [form],
  );

  const persist = useCallback(
    async (status?: SaveStatus, opts?: { silent?: boolean }) => {
      if (savingRef.current) return { ok: false };
      savingRef.current = true;
      setSaving(true);
      try {
        const current = form.productRef.current;
        if (!current.name.trim())
          throw new Error("Add a product name before saving.");

        const id = await ensureProductId();

        const response = await fetch("/api/3d-shop/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...buildProductPayload(form.productRef.current, status),
            id,
          }),
        });
        const data = (await response.json()) as {
          product?: ShopProduct;
          error?: string;
        };
        if (!response.ok || !data.product)
          throw new Error(data.error || "Failed to save product.");

        // Do NOT replace local state with the server echo here — local state
        // may contain newer edits made while the PATCH was in flight.
        form.setDirty(true);
        await saveAllVariants();
        await saveAllVariantDimensions();
        await saveAllSkus();
        form.markSaved(form.productRef.current);
        captureRevision(id);

        if (!opts?.silent) {
          setToast({
            type: "success",
            message:
              status === "publish" ? "Product published." : "Product saved.",
          });
        }
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save product.";
        if (!opts?.silent) setToast({ type: "error", message });
        return { ok: false, error: message };
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [
      captureRevision,
      ensureProductId,
      form,
      saveAllSkus,
      saveAllVariantDimensions,
      saveAllVariants,
    ],
  );

  const saveProduct = useCallback(
    async (status?: SaveStatus) => {
      if (status === "publish") {
        const blockers = getPublishBlockers(form.productRef.current);
        if (blockers.length > 0) {
          form.markAllTouched();
          setToast({
            type: "error",
            message: `Publish blocked: ${blockers.join(" · ")}`,
          });
          await persist("draft", { silent: true });
          return;
        }
      }
      await persist(status);
    },
    [form, persist],
  );

  const applyAiResult = useCallback(
    (kind: AiGenerationKind, result: AiGenerateResult) => {
      const cleanString = (value: unknown) =>
        typeof value === "string" ? value.trim() : "";
      switch (kind) {
        case "short_description":
          form.update("description", cleanString(result));
          break;
        case "long_description":
          form.update("long_description", cleanString(result));
          break;
        case "luxury_blocks":
          form.update(
            "long_description_blocks",
            Array.isArray(result)
              ? (result as unknown as DescriptionBlocks)
              : [],
          );
          break;
        case "meta_title":
          form.update("meta_title", cleanString(result).slice(0, 60));
          break;
        case "meta_description":
          form.update("meta_description", cleanString(result).slice(0, 160));
          break;
        case "tags":
          form.update(
            "tags",
            Array.isArray(result)
              ? (result as unknown as string[]).slice(0, 12)
              : [],
          );
          break;
        case "occasion_tags":
          form.update(
            "occasion_tags",
            Array.isArray(result)
              ? (result as unknown as string[]).slice(0, 12)
              : [],
          );
          break;
        case "all": {
          const all = result as Extract<
            AiGenerateResult,
            Record<string, unknown>
          >;
          form.updateMany({
            description: cleanString(all.short_description).slice(0, 200),
            long_description: cleanString(all.long_description),
            long_description_blocks: Array.isArray(all.luxury_blocks)
              ? (all.luxury_blocks as unknown as DescriptionBlocks)
              : [],
            meta_title: cleanString(all.meta_title).slice(0, 60),
            meta_description: cleanString(all.meta_description).slice(0, 160),
            tags: Array.isArray(all.tags) ? all.tags.slice(0, 12) : [],
            occasion_tags: Array.isArray(all.occasion_tags)
              ? all.occasion_tags.slice(0, 12)
              : [],
          });
          break;
        }
      }
    },
    [form],
  );

  const generateAi = useCallback(
    async (kind: AiGenerationKind) => {
      const current = form.productRef.current;
      if (!current.name.trim()) {
        setToast({
          type: "error",
          message: "Add a product name first so AI has context.",
        });
        return;
      }
      setAiBusy((prev) => ({ ...prev, [kind]: true }));
      try {
        const categoryName =
          categories.find((category) => category.id === current.category_id)
            ?.name ?? "";
        const response = await fetch("/api/3d-shop/admin/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            name: current.name,
            category: categoryName,
            description: current.description,
            tags: current.tags,
            occasion_tags: current.occasion_tags,
            tone: aiTone,
            prompt: aiPrompt.trim() || undefined,
            existing:
              kind === "long_description" || kind === "luxury_blocks"
                ? current.long_description
                : undefined,
            variants: variantsRef.current.map((variant) => ({
              option_name: variant.option_name,
              option_type: variant.option_type,
              values: variant.values ?? [],
            })),
            variant_dimensions: variantDimensionsRef.current.map((entry) => ({
              option_name: entry.option_name,
              option_value: entry.option_value,
              dimensions: entry.dimensions,
            })),
            default_dimensions: current.default_dimensions ?? undefined,
            base_price: current.base_price,
            skus: skusRef.current
              .filter((sku) => sku.is_available !== false)
              .map((sku) => ({
                variant_combination: sku.variant_combination,
                price: Number(sku.price),
                compare_at_price:
                  sku.compare_at_price === null
                    ? null
                    : Number(sku.compare_at_price),
              })),
          }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          result?: AiGenerateResult;
          error?: string;
        };
        if (!response.ok || data.result === undefined)
          throw new Error(data.error || "AI generation failed.");
        applyAiResult(kind, data.result);
        setToast({ type: "success", message: "AI copy generated." });
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "AI generation failed.",
        });
      } finally {
        setAiBusy((prev) => ({ ...prev, [kind]: false }));
      }
    },
    [aiPrompt, aiTone, categories, form, applyAiResult],
  );

  const generateAiField = useCallback(
    async (fieldContext: string, draftText: string) => {
      const current = form.productRef.current;
      if (!current.name.trim()) {
        throw new Error("Add a product name first so AI has context.");
      }
      const categoryName =
        categories.find((category) => category.id === current.category_id)
          ?.name ?? "";

      const response = await fetch("/api/3d-shop/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "inline_field",
          name: current.name,
          category: categoryName,
          description: current.description,
          tags: current.tags,
          occasion_tags: current.occasion_tags,
          tone: aiTone,
          field_context: fieldContext,
          draft_text: draftText,
          variants: variantsRef.current.map((variant) => ({
            option_name: variant.option_name,
            option_type: variant.option_type,
            values: variant.values ?? [],
          })),
          variant_dimensions: variantDimensionsRef.current.map((entry) => ({
            option_name: entry.option_name,
            option_value: entry.option_value,
            dimensions: entry.dimensions,
          })),
          default_dimensions: current.default_dimensions ?? undefined,
          base_price: current.base_price,
          skus: skusRef.current
            .filter((sku) => sku.is_available !== false)
            .map((sku) => ({
              variant_combination: sku.variant_combination,
              price: Number(sku.price),
              compare_at_price:
                sku.compare_at_price === null
                  ? null
                  : Number(sku.compare_at_price),
            })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        result?: string;
        error?: string;
      };
      if (!response.ok || data.result === undefined)
        throw new Error(data.error || "AI field generation failed.");

      setToast({
        type: "success",
        message: "Generated with AI. Press Ctrl+Z to undo.",
      });
      return data.result;
    },
    [aiTone, categories, form],
  );

  const generateAiSpecsRows = useCallback(
    async (draftText: string) => {
      const current = form.productRef.current;
      if (!current.name.trim()) {
        throw new Error("Add a product name first so AI has context.");
      }
      const categoryName =
        categories.find((category) => category.id === current.category_id)
          ?.name ?? "";

      const response = await fetch("/api/3d-shop/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "specs_table_rows",
          name: current.name,
          category: categoryName,
          description: current.description,
          tags: current.tags,
          occasion_tags: current.occasion_tags,
          tone: aiTone,
          draft_text: draftText,
          variants: variantsRef.current.map((variant) => ({
            option_name: variant.option_name,
            option_type: variant.option_type,
            values: variant.values ?? [],
          })),
          variant_dimensions: variantDimensionsRef.current.map((entry) => ({
            option_name: entry.option_name,
            option_value: entry.option_value,
            dimensions: entry.dimensions,
          })),
          default_dimensions: current.default_dimensions ?? undefined,
          base_price: current.base_price,
          skus: skusRef.current
            .filter((sku) => sku.is_available !== false)
            .map((sku) => ({
              variant_combination: sku.variant_combination,
              price: Number(sku.price),
              compare_at_price:
                sku.compare_at_price === null
                  ? null
                  : Number(sku.compare_at_price),
            })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        result?: { label: string; value: string }[];
        error?: string;
      };
      if (!response.ok || !data.result)
        throw new Error(data.error || "AI specs generation failed.");

      setToast({
        type: "success",
        message: "Generated with AI. Press Ctrl+Z to undo.",
      });
      return data.result;
    },
    [aiTone, categories, form],
  );

  const applyTemplate = useCallback(
    async (template: ProductTemplate) => {
      const hasExisting =
        variantsRef.current.length > 0 || skusRef.current.length > 0;
      if (
        hasExisting &&
        !window.confirm(
          "Applying a template will replace current variant options and SKUs. Continue?",
        )
      )
        return;
      try {
        const id = await ensureProductId();
        if (hasExisting) {
          for (const sku of skusRef.current) {
            await fetch(`/api/3d-shop/admin/products/${id}/skus?id=${sku.id}`, {
              method: "DELETE",
            });
          }
          for (const variant of variantsRef.current) {
            await fetch(
              `/api/3d-shop/admin/products/${id}/variants?id=${variant.id}`,
              { method: "DELETE" },
            );
          }
          setSkus([]);
          setVariants([]);
          setVariantDimensions([]);
          setVariantOptionImages([]);
          setSkuImages({});
        }

        const currentName =
          form.productRef.current.name.trim() || template.name;
        const templateHtml = templateLongDescription(template, currentName);
        const updates: Partial<ProductForm> = {
          name: currentName,
          description: template.short_description,
          long_description: templateHtml,
          long_description_blocks: convertRichHtmlToBlocks(
            templateHtml,
            currentName,
          ),
          tags: template.tags,
          occasion_tags: template.occasion_tags,
          is_customizable: template.is_customizable,
          customization_label: template.customization_label,
        };
        if (!slugTouchedRef.current)
          updates.slug = slugifyShopValue(currentName);
        form.updateMany(updates);

        const created: DraftVariant[] = [];
        for (let index = 0; index < template.variants.length; index += 1) {
          const variant = template.variants[index];
          const response = await fetch(
            `/api/3d-shop/admin/products/${id}/variants`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                option_name: variant.option_name,
                option_type: variant.option_type,
                values: variant.values,
                display_order: index,
                is_required: variant.is_required,
              }),
            },
          );
          const data = (await response.json()) as {
            variant?: ShopVariantOption;
            error?: string;
          };
          if (!response.ok || !data.variant)
            throw new Error(data.error || "Failed to apply template variant.");
          created.push(data.variant as DraftVariant);
        }
        setVariants(created);
        setToast({
          type: "success",
          message: `Template "${template.name}" applied. Add images, then generate SKUs to finish.`,
        });
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to apply template.",
        });
      }
    },
    [ensureProductId, form],
  );

  const duplicateProduct = useCallback(async () => {
    const current = form.productRef.current;
    if (!current.name.trim()) {
      setToast({
        type: "error",
        message: "Add a product name before duplicating.",
      });
      return;
    }
    try {
      const copyName = `${current.name.trim()} Copy`;
      const baseSlug = slugifyShopValue(copyName);
      let slug = baseSlug;
      let suffix = 2;
      const slugExists = async (candidate: string) => {
        const res = await fetch(
          `/api/3d-shop/admin/products?slug=${encodeURIComponent(candidate)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          available?: boolean;
        };
        return data.available === false;
      };
      while (await slugExists(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      const payload = buildProductPayload({
        ...current,
        name: copyName,
        slug,
        is_active: false,
        is_archived: false,
        is_featured: false,
        published_at: null,
      });
      delete payload.id;

      const response = await fetch("/api/3d-shop/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        product?: ShopProduct;
        error?: string;
      };
      if (!response.ok || !data.product)
        throw new Error(data.error || "Failed to duplicate product.");
      const newId = data.product.id;

      for (let index = 0; index < variantsRef.current.length; index += 1) {
        const variant = variantsRef.current[index];
        const res = await fetch(
          `/api/3d-shop/admin/products/${newId}/variants`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              option_name: variant.option_name,
              option_type: variant.option_type,
              values: variant.values ?? [],
              display_order: variant.display_order ?? index,
              is_required: variant.is_required ?? true,
            }),
          },
        );
        const vData = (await res.json()) as { error?: string };
        if (!res.ok)
          throw new Error(vData.error || "Failed to duplicate variants.");
      }

      const variantDimensionsPayload = variantDimensionsRef.current.map(
        (entry) => ({
          option_name: entry.option_name,
          option_value: entry.option_value,
          dimensions: entry.dimensions,
        }),
      );
      if (variantDimensionsPayload.length > 0) {
        const res = await fetch(
          `/api/3d-shop/admin/products/${newId}/variant-dimensions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dimensions: variantDimensionsPayload }),
          },
        );
        const dData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok)
          throw new Error(dData.error || "Failed to duplicate dimensions.");
      }

      const variantImagesPayload = variantOptionImagesRef.current.map(
        (image) => ({
          option_name: image.option_name,
          option_value: image.option_value,
          image_url: image.image_url,
          alt_text: image.alt_text,
          display_order: image.display_order,
          is_primary: image.is_primary,
        }),
      );
      if (variantImagesPayload.length > 0) {
        const res = await fetch(
          `/api/3d-shop/admin/products/${newId}/variant-images`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: variantImagesPayload }),
          },
        );
        const iData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok)
          throw new Error(iData.error || "Failed to duplicate variant images.");
      }

      const skuRows = skusRef.current.map((sku, index) => ({
        sku_code: `${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
        variant_combination: sku.variant_combination,
        price: sku.price,
        compare_at_price: sku.compare_at_price,
        stock_quantity: sku.stock_quantity,
        low_stock_threshold: sku.low_stock_threshold,
        weight_grams: sku.weight_grams,
        variant_image_url: sku.variant_image_url,
        is_available: sku.is_available,
      }));
      if (skuRows.length > 0) {
        const res = await fetch(`/api/3d-shop/admin/products/${newId}/skus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skus: skuRows }),
        });
        const sData = (await res.json()) as {
          skus?: ShopSku[];
          error?: string;
        };
        if (!res.ok)
          throw new Error(sData.error || "Failed to duplicate SKUs.");

        const newSkus = sData.skus ?? [];
        for (const sku of skusRef.current) {
          const images = skuImagesRef.current[sku.id] ?? [];
          if (images.length === 0) continue;
          const match = newSkus.find(
            (newSku) =>
              stableStringify(newSku.variant_combination) ===
              stableStringify(sku.variant_combination),
          );
          if (!match) continue;
          const imageResponse = await fetch(
            `/api/3d-shop/admin/skus/${match.id}/images`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                images: images.map((image, index) => ({
                  image_url: image.image_url,
                  alt_text: image.alt_text,
                  display_order: index,
                  is_primary: image.is_primary,
                })),
              }),
            },
          );
          if (!imageResponse.ok)
            throw new Error("Failed to duplicate SKU images.");
        }
      }

      setToast({
        type: "success",
        message: "Product duplicated. Opening the copy…",
      });
      router.push(`/admin/3d-shop/products/${newId}/edit`);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to duplicate product.",
      });
    }
  }, [form, router]);

  const restoreRevision = useCallback(
    async (timestamp: number) => {
      const target = revisions.find(
        (revision) => revision.timestamp === timestamp,
      );
      if (!target) return;
      if (
        !window.confirm(
          "Restore this version? Your current changes will be replaced by the snapshot.",
        )
      )
        return;
      try {
        form.updateMany(target.product);
        setVariants(
          target.variants.map((variant) => ({ ...variant, dirty: true })),
        );
        setSkus(target.skus.map((sku) => ({ ...sku, dirty: true })));
        setVariantDimensions(target.variant_dimensions ?? []);
        setVariantOptionImages(target.variant_option_images ?? []);
        setSkuImages(target.sku_images ?? {});
        setToast({ type: "info", message: "Snapshot restored — saving…" });
        await persist("draft");
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to restore version.",
        });
      }
    },
    [form, persist, revisions],
  );

  const clearRevisionHistory = useCallback(() => {
    const id = form.productRef.current.id;
    if (!id) return;
    if (!window.confirm("Clear all saved revisions for this product?")) return;
    clearRevisions(id);
    setRevisions([]);
    setToast({ type: "success", message: "Revision history cleared." });
  }, [form]);

  useEffect(() => {
    if (!form.dirty) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      void persist("draft", { silent: true });
    }, AUTOSAVE_DELAY);
    return () => {
      if (autosaveTimerRef.current)
        window.clearTimeout(autosaveTimerRef.current);
    };
  }, [form.dirty, form.product, persist]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.isContentEditable === true ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && key === "s") {
        event.preventDefault();
        void saveProduct("draft");
        return;
      }
      if (mod && event.shiftKey && key === "p") {
        event.preventDefault();
        void saveProduct("publish");
        return;
      }
      if (!isEditable && mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) form.redo();
        else form.undo();
        return;
      }
      if (!isEditable && mod && key === "y") {
        event.preventDefault();
        form.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form, saveProduct]);

  const deleteStorageAsset = useCallback((url: string) => {
    if (!url) return;
    // Best-effort orphan cleanup — removal from the product must not depend
    // on storage deletion succeeding.
    void fetch("/api/3d-shop/admin/storage/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  }, []);

  const uploadImage = useCallback(
    async (
      file: File,
      target: "gallery" | "variant" = "gallery",
      skuId?: string,
      onProgress?: (progress: number) => void,
    ) => {
      const validationError = validateImageFile(file);
      if (validationError) throw new Error(validationError);

      const id = await ensureProductId();
      const report =
        onProgress ??
        ((progress: number) => {
          setUploadState((current) => {
            const entries = Object.entries(current).filter(
              ([, state]) => state.status !== "done",
            );
            const key = `gallery-${file.name}-${entries.length}`;
            return {
              ...current,
              [key]: {
                status: progress >= 100 ? "done" : "uploading",
                progress,
              },
            };
          });
        });

      report(5);
      const { publicUrl } = await uploadFileWithProgress(
        "/api/3d-shop/admin/upload",
        file,
        id,
        (progress) => {
          report(Math.min(99, progress));
        },
      );
      report(100);

      if (target === "variant" && skuId) {
        form.pushUndoPoint();
        setSkus((current) =>
          current.map((sku) =>
            sku.id === skuId
              ? { ...sku, variant_image_url: publicUrl, dirty: true }
              : sku,
          ),
        );
        form.setDirty(true);
        return publicUrl;
      }

      const current = form.productRef.current;
      const hasThumbnail = Boolean(current.thumbnail_url);
      if (!hasThumbnail) {
        // First image becomes the cover photo (position 1). The gallery grid
        // renders [cover, ...gallery] as one ordered list.
        form.updateMany({ thumbnail_url: publicUrl });
      } else {
        if (current.image_urls.length + 1 > MAX_GALLERY_IMAGES) {
          throw new Error(
            `Gallery is limited to ${MAX_GALLERY_IMAGES} images.`,
          );
        }
        form.pushUndoPoint();
        form.patchLocal({ image_urls: [...current.image_urls, publicUrl] });
      }

      // Persistence goes through the single debounced autosave path — no
      // ad-hoc full-row PATCH here (it raced autosave and could clobber
      // concurrent edits with stale snapshots).
      return publicUrl;
    },
    [ensureProductId, form],
  );

  const uploadBlockImage = useCallback(
    async (file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) throw new Error(validationError);
      const id = await ensureProductId();
      const { publicUrl } = await uploadFileWithProgress(
        "/api/3d-shop/admin/upload",
        file,
        id,
        () => {},
      );
      return publicUrl;
    },
    [ensureProductId],
  );

  const uploadModel = useCallback(
    async (file: File) => {
      const id = await ensureProductId();
      const tempKey = `model-${file.name}-${Date.now()}`;
      setUploadState((current) => ({
        ...current,
        [tempKey]: { status: "uploading", progress: 0 },
      }));
      try {
        const { publicUrl } = await uploadModelFileWithProgress(
          file,
          id,
          (progress) => {
            setUploadState((current) => ({
              ...current,
              [tempKey]: { status: "uploading", progress },
            }));
          },
        );
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "done", progress: 100 },
        }));
        updateProduct("model_url", publicUrl);
      } catch (error) {
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "error", progress: 0 },
        }));
        throw error;
      }
    },
    [ensureProductId, updateProduct],
  );

  const removeModel = useCallback(() => {
    deleteStorageAsset(form.productRef.current.model_url);
    updateProduct("model_url", "");
  }, [deleteStorageAsset, form, updateProduct]);

  const uploadProductAsset = useCallback(
    async (
      file: File,
      kind: ModelUploadKind,
      field: "model_url" | "usdz_url" | "hero_video_url",
    ) => {
      const id = await ensureProductId();
      const tempKey = `${field}-${file.name}-${Date.now()}`;
      setUploadState((current) => ({
        ...current,
        [tempKey]: { status: "uploading", progress: 0 },
      }));
      try {
        const { publicUrl } = await uploadModelFileWithProgress(
          file,
          id,
          (progress) => {
            setUploadState((current) => ({
              ...current,
              [tempKey]: { status: "uploading", progress },
            }));
          },
          kind,
        );
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "done", progress: 100 },
        }));
        updateProduct(field, publicUrl);
      } catch (error) {
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "error", progress: 0 },
        }));
        throw error;
      }
    },
    [ensureProductId, updateProduct],
  );

  const removeProductAsset = useCallback(
    (field: "model_url" | "usdz_url" | "hero_video_url") => {
      deleteStorageAsset(form.productRef.current[field]);
      updateProduct(field, "");
    },
    [deleteStorageAsset, form, updateProduct],
  );

  const uploadLandscapeImage = useCallback(
    async (file: File, onProgress?: (progress: number) => void) => {
      const validationError = validateImageFile(file);
      if (validationError) throw new Error(validationError);

      const id = await ensureProductId();
      const report =
        onProgress ??
        ((progress: number) => {
          setUploadState((current) => {
            const entries = Object.entries(current).filter(([key]) =>
              key.startsWith("landscape-"),
            );
            const key = `landscape-${entries.length}`;
            return {
              ...current,
              [key]: {
                status: progress >= 100 ? "done" : "uploading",
                progress,
              },
            };
          });
        });

      report(5);
      const { publicUrl } = await uploadFileWithProgress(
        "/api/3d-shop/admin/upload",
        file,
        id,
        (progress) => {
          report(Math.min(99, progress));
        },
      );
      report(100);
      form.patchLocal({ landscape_image_url: publicUrl });
      return publicUrl;
    },
    [ensureProductId, form],
  );

  const removeLandscapeImage = useCallback(() => {
    deleteStorageAsset(form.productRef.current.landscape_image_url);
    form.update("landscape_image_url", "");
  }, [deleteStorageAsset, form]);

  const attachLibraryImage = useCallback(
    (url: string) => {
      const current = form.productRef.current;
      if (current.thumbnail_url === url || current.image_urls.includes(url)) {
        setToast({
          type: "error",
          message: "This image is already in the gallery.",
        });
        return;
      }
      if (!current.thumbnail_url) {
        form.updateMany({ thumbnail_url: url });
        return;
      }
      if (current.image_urls.length >= MAX_GALLERY_IMAGES) {
        setToast({
          type: "error",
          message: `Gallery is limited to ${MAX_GALLERY_IMAGES} images.`,
        });
        return;
      }
      form.pushUndoPoint();
      form.patchLocal({ image_urls: [...current.image_urls, url] });
    },
    [form],
  );

  const setThumbnail = useCallback(
    (url: string) => {
      form.updateMany({
        thumbnail_url: url,
        image_urls: [
          form.productRef.current.thumbnail_url,
          ...form.productRef.current.image_urls,
        ]
          .filter((item) => item !== url)
          .filter(Boolean),
      });
    },
    [form],
  );

  const removeImage = useCallback(
    async (url: string) => {
      const productId = form.productRef.current.id;

      // 1. Delete from the database FIRST — if any delete fails, abort and
      //    keep the image in the UI so the user knows it wasn't removed.
      if (productId) {
        // Variant-option assignments
        const variantMatches = variantOptionImagesRef.current.filter(
          (image) => image.image_url === url,
        );
        if (variantMatches.length > 0) {
          for (const image of variantMatches) {
            const response = await fetch(
              `/api/3d-shop/admin/products/${productId}/variant-images?id=${encodeURIComponent(image.id)}`,
              { method: "DELETE" },
            );
            if (!response.ok)
              throw new Error(
                "Failed to remove the image from its variant assignment. Please retry.",
              );
          }
        }

        // SKU assignments + variant_image_url
        for (const sku of skusRef.current) {
          const skuMatches = (skuImagesRef.current[sku.id] ?? []).filter(
            (image) => image.image_url === url,
          );
          for (const image of skuMatches) {
            const response = await fetch(
              `/api/3d-shop/admin/skus/${encodeURIComponent(sku.id)}/images?id=${encodeURIComponent(image.id)}`,
              { method: "DELETE" },
            );
            if (!response.ok)
              throw new Error(
                "Failed to remove the image from its SKU assignment. Please retry.",
              );
          }
          if (sku.variant_image_url === url) {
            const response = await fetch(
              `/api/3d-shop/admin/products/${productId}/skus`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: sku.id, variant_image_url: null }),
              },
            );
            if (!response.ok)
              throw new Error(
                "Failed to clear the image from the SKU cover. Please retry.",
              );
          }
        }
      }

      // 2. All DB deletes succeeded — now update the local UI state.
      const images = [
        form.productRef.current.thumbnail_url,
        ...form.productRef.current.image_urls,
      ].filter((item) => item && item !== url) as string[];
      const imageAlt = { ...form.productRef.current.image_alt };
      delete imageAlt[url];
      form.updateMany({
        thumbnail_url: images[0] ?? "",
        image_urls: images.slice(1),
        image_alt: imageAlt,
      });

      if (productId) {
        if (
          variantOptionImagesRef.current.some((img) => img.image_url === url)
        ) {
          setVariantOptionImages((current) =>
            current.filter((image) => image.image_url !== url),
          );
        }
        const affectedSkuIds = new Set<string>();
        for (const sku of skusRef.current) {
          const skuMatches = (skuImagesRef.current[sku.id] ?? []).filter(
            (image) => image.image_url === url,
          );
          if (skuMatches.length > 0 || sku.variant_image_url === url)
            affectedSkuIds.add(sku.id);
        }
        if (affectedSkuIds.size > 0) {
          setSkuImages((current) => {
            const next: Record<string, ShopSkuImage[]> = { ...current };
            for (const skuId of affectedSkuIds) {
              next[skuId] = (next[skuId] ?? []).filter(
                (image) => image.image_url !== url,
              );
            }
            return next;
          });
          setSkus((current) =>
            current.map((sku) =>
              sku.variant_image_url === url
                ? { ...sku, variant_image_url: null, dirty: true }
                : sku,
            ),
          );
        }
      }

      // 3. Best-effort storage cleanup — never fails the operation.
      deleteStorageAsset(url);
    },
    [deleteStorageAsset, form],
  );

  const setImageAlt = useCallback(
    (url: string, alt: string) => {
      const trimmed = alt.trim();
      const imageAlt = { ...form.productRef.current.image_alt };
      if (trimmed) imageAlt[url] = trimmed;
      else delete imageAlt[url];
      form.update("image_alt", imageAlt);
    },
    [form],
  );

  const assignToVariantOption = useCallback(
    async (url: string, optionName: string, optionValue: string) => {
      const id = form.productRef.current.id;
      if (!id)
        throw new Error("Save the product first before assigning images.");
      const exists = variantOptionImagesRef.current.some(
        (image) =>
          image.image_url === url &&
          image.option_name === optionName &&
          image.option_value === optionValue,
      );
      if (exists) return;
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variant-images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: [
              {
                option_name: optionName,
                option_value: optionValue,
                image_url: url,
              },
            ],
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        images?: ShopVariantOptionImage[];
        error?: string;
      };
      if (!response.ok || !data.images || data.images.length === 0)
        throw new Error(data.error || "Failed to assign image to variant.");
      form.setDirty(true);
      setVariantOptionImages((current) => [...current, ...data.images!]);
    },
    [form],
  );

  const unassignVariantOptionImage = useCallback(
    async (imageId: string) => {
      const id = form.productRef.current.id;
      if (!id) return;
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variant-images?id=${encodeURIComponent(imageId)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to remove variant assignment.");
      setVariantOptionImages((current) =>
        current.filter((image) => image.id !== imageId),
      );
    },
    [form],
  );

  const assignToSku = useCallback(
    async (url: string, skuId: string) => {
      const exists = (skuImagesRef.current[skuId] ?? []).some(
        (image) => image.image_url === url,
      );
      if (exists) return;
      const response = await fetch(
        `/api/3d-shop/admin/skus/${encodeURIComponent(skuId)}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [{ image_url: url }] }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        images?: ShopSkuImage[];
        error?: string;
      };
      if (!response.ok || !data.images || data.images.length === 0)
        throw new Error(data.error || "Failed to assign image to SKU.");
      form.setDirty(true);
      setSkuImages((current) => ({
        ...current,
        [skuId]: [...(current[skuId] ?? []), ...data.images!],
      }));
    },
    [form],
  );

  const unassignSkuImage = useCallback(async (imageId: string) => {
    const skuId = Object.entries(skuImagesRef.current).find(([, images]) =>
      images.some((image) => image.id === imageId),
    )?.[0];
    if (!skuId) return;
    const response = await fetch(
      `/api/3d-shop/admin/skus/${encodeURIComponent(skuId)}/images?id=${encodeURIComponent(imageId)}`,
      { method: "DELETE" },
    );
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok)
      throw new Error(data.error || "Failed to remove SKU assignment.");
    setSkuImages((current) => ({
      ...current,
      [skuId]: (current[skuId] ?? []).filter((image) => image.id !== imageId),
    }));
  }, []);

  const clearSkuVariantImage = useCallback(
    async (skuId: string) => {
      const id = form.productRef.current.id;
      if (!id) return;
      const sku = skusRef.current.find((sku) => sku.id === skuId);
      if (!sku || !sku.variant_image_url) return;
      const response = await fetch(`/api/3d-shop/admin/products/${id}/skus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: skuId, variant_image_url: null }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to clear SKU image.");
      setSkus((current) =>
        current.map((sku) =>
          sku.id === skuId
            ? { ...sku, variant_image_url: null, dirty: true }
            : sku,
        ),
      );
      form.setDirty(true);
    },
    [form],
  );

  const generateImageAlt = useCallback(
    async (url: string) => {
      const current = form.productRef.current;
      if (!current.name.trim()) {
        setToast({
          type: "error",
          message: "Add a product name first so AI can write alt text.",
        });
        return "";
      }
      const variantAssignments: string[] = [];
      for (const image of variantOptionImagesRef.current) {
        if (image.image_url === url)
          variantAssignments.push(
            `${image.option_name}: ${image.option_value}`,
          );
      }
      for (const sku of skusRef.current) {
        if (sku.variant_image_url === url)
          variantAssignments.push(skuLabel(sku.variant_combination));
        for (const image of skuImagesRef.current[sku.id] ?? []) {
          if (image.image_url === url)
            variantAssignments.push(skuLabel(sku.variant_combination));
        }
      }
      const category =
        categories.find((category) => category.id === current.category_id)
          ?.name ?? "";
      const response = await fetch("/api/3d-shop/admin/ai/alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: current.name,
          category,
          variant_assignments: [...new Set(variantAssignments)],
          tags: current.tags ?? [],
          image_url: url,
          existing_alt: current.image_alt?.[url] ?? "",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        alt_text?: string;
        error?: string;
      };
      if (!response.ok || !data.alt_text)
        throw new Error(data.error || "AI alt text generation failed.");
      setImageAlt(url, data.alt_text);
      setToast({ type: "success", message: "AI alt text generated." });
      return data.alt_text;
    },
    [categories, form, setImageAlt, setToast],
  );

  const handleImageDrop = useCallback(
    (targetUrl: string) => {
      if (!dragImage || dragImage === targetUrl) return;
      const images = [
        form.productRef.current.thumbnail_url,
        ...form.productRef.current.image_urls,
      ].filter(Boolean);
      const from = images.indexOf(dragImage);
      const to = images.indexOf(targetUrl);
      if (from < 0 || to < 0) return;
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      form.updateMany({
        thumbnail_url: images[0] ?? "",
        image_urls: images.slice(1),
      });
      setDragImage(null);
    },
    [dragImage, form],
  );

  const addVariant = useCallback(async () => {
    try {
      const id = await ensureProductId();
      form.pushUndoPoint();
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            option_name: "Size",
            option_type: "button",
            values: [],
            display_order: variantsRef.current.length,
            is_required: true,
          }),
        },
      );
      const data = (await response.json()) as {
        variant?: ShopVariantOption;
        error?: string;
      };
      if (!response.ok || !data.variant)
        throw new Error(data.error || "Failed to add variant.");
      setVariants((current) => [...current, data.variant as DraftVariant]);
      return data.variant;
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to add variant.",
      });
      return null;
    }
  }, [ensureProductId, form]);

  const updateVariant = useCallback(
    <K extends keyof ShopVariantOption>(
      variantId: string,
      key: K,
      value: ShopVariantOption[K],
    ) => {
      form.pushUndoPoint();
      setVariants((current) =>
        current.map((variant) =>
          variant.id === variantId
            ? { ...variant, [key]: value, dirty: true }
            : variant,
        ),
      );
      form.setDirty(true);
    },
    [form],
  );

  const deleteVariant = useCallback(
    async (variant: DraftVariant) => {
      const id = form.productRef.current.id;
      if (
        !id ||
        !window.confirm(`Delete variant option "${variant.option_name}"?`)
      )
        return;
      form.pushUndoPoint();
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variants?id=${variant.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setToast({
          type: "error",
          message: data.error || "Failed to delete variant.",
        });
        return;
      }
      setVariants((current) =>
        current.filter((item) => item.id !== variant.id),
      );
    },
    [form],
  );

  const reorderVariants = useCallback(
    async (targetId: string) => {
      const id = form.productRef.current.id;
      if (!dragVariant || dragVariant === targetId || !id) return;
      const current = [...variantsRef.current];
      const from = current.findIndex((variant) => variant.id === dragVariant);
      const to = current.findIndex((variant) => variant.id === targetId);
      if (from < 0 || to < 0) return;
      form.pushUndoPoint();
      const [moved] = current.splice(from, 1);
      current.splice(to, 0, moved);
      const ordered = current.map((variant, index) => ({
        ...variant,
        display_order: index,
      }));
      setVariants(ordered);
      setDragVariant(null);
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orders: ordered.map((variant) => ({
              id: variant.id,
              display_order: variant.display_order ?? 0,
            })),
          }),
        },
      );
      if (!response.ok)
        setToast({ type: "error", message: "Failed to save variant order." });
    },
    [dragVariant, form],
  );

  const updateVariantValueMetadata = useCallback(
    (
      variantId: string,
      value: string,
      patch: Partial<VariantValueMetadata>,
    ) => {
      form.pushUndoPoint();
      setVariants((current) =>
        current.map((variant) => {
          if (variant.id !== variantId) return variant;
          const metadata = { ...(variant.value_metadata ?? {}) };
          metadata[value] = { ...(metadata[value] ?? {}), ...patch };
          return { ...variant, value_metadata: metadata, dirty: true };
        }),
      );
      form.setDirty(true);
    },
    [form],
  );

  const removeVariantValue = useCallback(
    (variantId: string, value: string) => {
      form.pushUndoPoint();
      setVariants((current) =>
        current.map((variant) => {
          if (variant.id !== variantId) return variant;
          const values = (variant.values ?? []).filter(
            (item) => item !== value,
          );
          const metadata = { ...(variant.value_metadata ?? {}) };
          delete metadata[value];
          return { ...variant, values, value_metadata: metadata, dirty: true };
        }),
      );
      form.setDirty(true);
    },
    [form],
  );

  const reorderVariantValues = useCallback(
    (variantId: string, orderedValues: string[]) => {
      form.pushUndoPoint();
      setVariants((current) =>
        current.map((variant) =>
          variant.id === variantId
            ? { ...variant, values: orderedValues, dirty: true }
            : variant,
        ),
      );
      form.setDirty(true);
    },
    [form],
  );

  const pricingRuleApi = useCallback(
    async (
      method: "POST" | "PATCH" | "DELETE",
      payload: Record<string, unknown> & { id?: string },
    ) => {
      const id = await ensureProductId();
      const query = payload.id ? `?id=${encodeURIComponent(payload.id)}` : "";
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/pricing-rules${query}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "DELETE" ? undefined : JSON.stringify(payload),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        rule?: ShopSkuPricingRule;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to save pricing rule.");
      return data.rule;
    },
    [ensureProductId],
  );

  const addPricingRule = useCallback(
    async (
      rule: Omit<
        ShopSkuPricingRule,
        "id" | "product_id" | "created_at" | "updated_at"
      >,
    ) => {
      try {
        const saved = await pricingRuleApi("POST", rule);
        if (saved)
          setPricingRules((current) => [
            ...current.filter((item) => item.id !== saved.id),
            saved,
          ]);
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to add rule.",
        });
      }
    },
    [pricingRuleApi],
  );

  const updatePricingRule = useCallback(
    async (ruleId: string, patch: Partial<ShopSkuPricingRule>) => {
      try {
        const saved = await pricingRuleApi("PATCH", { ...patch, id: ruleId });
        if (saved)
          setPricingRules((current) =>
            current.map((rule) => (rule.id === saved.id ? saved : rule)),
          );
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to update rule.",
        });
      }
    },
    [pricingRuleApi],
  );

  const deletePricingRule = useCallback(
    async (ruleId: string) => {
      try {
        await pricingRuleApi("DELETE", { id: ruleId });
        setPricingRules((current) =>
          current.filter((rule) => rule.id !== ruleId),
        );
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to delete rule.",
        });
      }
    },
    [pricingRuleApi],
  );

  const buildPatternOptions = useCallback((): SkuPatternOption[] => {
    return variantsRef.current
      .filter((variant) => isDiscreteOptionType(variant.option_type))
      .map((variant) => ({
        name: variant.option_name,
        values: (variant.values ?? []).filter(Boolean),
        metadata: variant.value_metadata ?? undefined,
        type: variant.option_type,
      }))
      .filter((variant) => variant.values.length > 0);
  }, []);

  const generateSkuPreview = useCallback(async () => {
    await ensureProductId();
    await saveAllVariants();
    const product = form.productRef.current;
    const options = buildPatternOptions();
    return buildSkuRows({
      product: {
        slug: product.slug,
        name: product.name,
        base_price: product.base_price || 0,
        sku_pattern: product.sku_pattern || undefined,
      },
      variants: options,
      rules: pricingRulesRef.current,
      defaultWeight,
      defaultCost,
      defaultCompareAt,
      existingCodes: skusRef.current.map((sku) => sku.sku_code),
    });
  }, [
    buildPatternOptions,
    defaultWeight,
    defaultCost,
    defaultCompareAt,
    ensureProductId,
    form,
    saveAllVariants,
  ]);

  const generateSkus = useCallback(
    async (rows?: SkuDraftRow[]) => {
      try {
        const id = await ensureProductId();
        await saveAllVariants();
        const draftRows =
          rows ??
          (await generateSkuPreview().catch(() => {
            const product = form.productRef.current;
            const options = buildPatternOptions();
            return buildSkuRows({
              product: {
                slug: product.slug,
                name: product.name,
                base_price: product.base_price || 0,
                sku_pattern: product.sku_pattern || undefined,
              },
              variants: options,
              rules: pricingRulesRef.current,
              defaultWeight,
              defaultCost,
              defaultCompareAt,
              existingCodes: skusRef.current.map((sku) => sku.sku_code),
            });
          }));

        const existingKeys = new Set(
          skusRef.current.map((sku) =>
            stableStringify(sku.variant_combination),
          ),
        );
        const payload = draftRows
          .filter(
            (row) =>
              !existingKeys.has(stableStringify(row.variant_combination)),
          )
          .map((row) => ({
            sku_code: row.sku_code,
            variant_combination: row.variant_combination,
            price: row.price,
            compare_at_price: row.compare_at_price,
            cost_price: row.cost_price,
            stock_quantity: row.stock_quantity,
            low_stock_threshold: row.low_stock_threshold,
            weight_grams: row.weight_grams,
            is_available: row.is_available,
          }));

        if (payload.length === 0) {
          setToast({
            type: "success",
            message: "All combinations already exist.",
          });
          return;
        }

        form.pushUndoPoint();
        const response = await fetch(`/api/3d-shop/admin/products/${id}/skus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skus: payload }),
        });
        const data = (await response.json()) as {
          skus?: ShopSku[];
          inserted?: number;
          skipped?: number;
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error || "Failed to generate SKUs.");
        setSkus(data.skus ?? []);
        const loaded = data.skus ?? [];
        await loadTierPrices(loaded.map((sku) => sku.id));
        setToast({
          type: "success",
          message: `Generated ${data.inserted ?? 0} SKU${data.inserted === 1 ? "" : "s"}. Skipped ${data.skipped ?? 0}.`,
        });
        window.setTimeout(
          () =>
            skuSectionRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          100,
        );
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to generate SKUs.",
        });
      }
    },
    [
      buildPatternOptions,
      defaultWeight,
      defaultCost,
      defaultCompareAt,
      ensureProductId,
      form,
      generateSkuPreview,
      loadTierPrices,
      saveAllVariants,
    ],
  );

  const updateTierPrices = useCallback(
    async (skuId: string, prices: { tier_name: string; price: number }[]) => {
      try {
        const response = await fetch(
          `/api/3d-shop/admin/skus/${skuId}/tier-prices`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier_prices: prices }),
          },
        );
        const data = (await response.json()) as {
          tier_prices?: ShopSkuTierPrice[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error || "Failed to save tier prices.");
        setTierPrices((current) => ({
          ...current,
          [skuId]: data.tier_prices ?? [],
        }));
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to save tier prices.",
        });
      }
    },
    [],
  );

  const syncBasePriceFromSkus = useCallback(
    (rows: ShopSku[]) => {
      const prices = rows
        .filter((sku) => sku.is_available !== false)
        .map((sku) => Number(sku.price))
        .filter(Number.isFinite);
      if (prices.length > 0)
        form.patchLocal({ base_price: Math.min(...prices) });
    },
    [form],
  );

  const updateSku = useCallback(
    <K extends keyof ShopSku>(skuId: string, key: K, value: ShopSku[K]) => {
      form.pushUndoPoint();
      setSkus((current) =>
        current.map((sku) =>
          sku.id === skuId ? { ...sku, [key]: value, dirty: true } : sku,
        ),
      );
      if (key === "price" || key === "is_available") {
        syncBasePriceFromSkus(
          skusRef.current.map((sku) =>
            sku.id === skuId ? { ...sku, [key]: value } : sku,
          ),
        );
      }
      form.setDirty(true);
    },
    [form, syncBasePriceFromSkus],
  );

  const generateSkuQr = useCallback(
    async (skuId: string) => {
      try {
        const response = await fetch(`/api/3d-shop/admin/skus/${skuId}/qr`, {
          method: "POST",
        });
        const data = (await response.json()) as {
          qr_url?: string;
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error || "Failed to generate QR.");
        updateSku(skuId, "qr_url", data.qr_url ?? null);
        return data.qr_url ?? null;
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to generate QR.",
        });
        return null;
      }
    },
    [updateSku],
  );

  const uploadSkuModel = useCallback(
    async (skuId: string, file: File) => {
      const id = await ensureProductId();
      const tempKey = `sku-model-${skuId}-${Date.now()}`;
      setUploadState((current) => ({
        ...current,
        [tempKey]: { status: "uploading", progress: 0 },
      }));
      try {
        const { publicUrl } = await uploadModelFileWithProgress(
          file,
          id,
          (progress) => {
            setUploadState((current) => ({
              ...current,
              [tempKey]: { status: "uploading", progress },
            }));
          },
          "model",
        );
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "done", progress: 100 },
        }));
        updateSku(skuId, "model_url", publicUrl);
      } catch (error) {
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "error", progress: 0 },
        }));
        throw error;
      }
    },
    [ensureProductId, updateSku],
  );

  const bulkUpdateSkus = useCallback(
    (partial: Partial<ShopSku>, ids?: string[]) => {
      form.pushUndoPoint();
      const targetIds = ids && ids.length > 0 ? new Set(ids) : null;
      setSkus((current) =>
        current.map((sku) =>
          targetIds && !targetIds.has(sku.id)
            ? sku
            : { ...sku, ...partial, dirty: true },
        ),
      );
      if ("price" in partial || "is_available" in partial) {
        const updated = skusRef.current.map((sku) =>
          targetIds && !targetIds.has(sku.id) ? sku : { ...sku, ...partial },
        );
        syncBasePriceFromSkus(updated);
      }
      form.setDirty(true);
    },
    [form, syncBasePriceFromSkus],
  );

  const saveAllSkusWithToast = useCallback(async () => {
    try {
      await saveAllSkus();
      setToast({ type: "success", message: "SKUs saved." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to save SKUs.",
      });
    }
  }, [saveAllSkus]);

  const deleteSku = useCallback(
    async (skuId: string) => {
      const id = form.productRef.current.id;
      if (!id) return;
      if (!window.confirm("Delete this SKU? This action cannot be undone."))
        return;

      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/skus?id=${encodeURIComponent(skuId)}`,
        {
          method: "DELETE",
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        const message = data.error || "Failed to delete SKU.";
        setToast({ type: "error", message });
        throw new Error(message);
      }

      setSkus((current) => current.filter((sku) => sku.id !== skuId));
      const remaining = skusRef.current.filter((sku) => sku.id !== skuId);
      syncBasePriceFromSkus(remaining);
      form.setDirty(true);
      setToast({ type: "success", message: "SKU deleted." });
    },
    [form, syncBasePriceFromSkus],
  );

  const updateVariantDimension = useCallback(
    (
      optionName: string,
      optionValue: string,
      dimensions: ProductDimensions,
    ) => {
      form.pushUndoPoint();
      setVariantDimensions((current) => {
        const existing = current.find(
          (entry) =>
            entry.option_name === optionName &&
            entry.option_value === optionValue,
        );
        if (existing) {
          return current.map((entry) =>
            entry.id === existing.id
              ? { ...entry, dimensions, updated_at: new Date().toISOString() }
              : entry,
          );
        }
        return [
          ...current,
          {
            id: `draft-${Date.now()}`,
            product_id: form.productRef.current.id ?? "",
            option_name: optionName,
            option_value: optionValue,
            dimensions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });
      form.setDirty(true);
    },
    [form],
  );

  const deleteVariantDimension = useCallback(
    async (dimensionId: string) => {
      const id = form.productRef.current.id;
      if (!dimensionId || dimensionId.startsWith("draft-")) {
        setVariantDimensions((current) =>
          current.filter((entry) => entry.id !== dimensionId),
        );
        return;
      }
      if (!id) return;
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variant-dimensions?id=${encodeURIComponent(dimensionId)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setToast({
          type: "error",
          message: data.error || "Failed to delete dimension.",
        });
        return;
      }
      setVariantDimensions((current) =>
        current.filter((entry) => entry.id !== dimensionId),
      );
      form.setDirty(true);
    },
    [form],
  );

  const applyDefaultDimensionsToUnset = useCallback(() => {
    const defaults = form.productRef.current.default_dimensions;
    if (!defaults) {
      setToast({
        type: "error",
        message: "Set default dimensions on the product first.",
      });
      return;
    }
    const variants = variantsRef.current;
    const current = variantDimensionsRef.current;
    const existing = new Map<string, ShopVariantOptionDimension>(
      current.map((entry) => [
        `${entry.option_name}\u0000${entry.option_value}`,
        entry,
      ]),
    );
    const additions: ShopVariantOptionDimension[] = [];
    for (const variant of variants) {
      for (const value of variant.values ?? []) {
        const key = `${variant.option_name}\u0000${value}`;
        if (existing.has(key)) continue;
        additions.push({
          id: `draft-${Date.now()}-${additions.length}`,
          product_id: form.productRef.current.id ?? "",
          option_name: variant.option_name,
          option_value: value,
          dimensions: { ...defaults },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (additions.length === 0) {
      setToast({
        type: "info",
        message: "All option values already have dimensions.",
      });
      return;
    }
    setVariantDimensions((currentRows) => [...currentRows, ...additions]);
    form.setDirty(true);
    setToast({
      type: "success",
      message: `Applied defaults to ${additions.length} value${additions.length === 1 ? "" : "s"}.`,
    });
  }, [form]);

  const addVariantOptionImage = useCallback(
    async (optionName: string, optionValue: string, file: File) => {
      const id = await ensureProductId();
      const tempKey = `variant-${optionName}-${optionValue}-${file.name}-${Date.now()}`;
      setUploadState((current) => ({
        ...current,
        [tempKey]: { status: "uploading", progress: 0 },
      }));
      try {
        const data = (await uploadFormFileWithProgress(
          `/api/3d-shop/admin/products/${id}/variant-images`,
          file,
          { option_name: optionName, option_value: optionValue },
          (progress) => {
            setUploadState((current) => ({
              ...current,
              [tempKey]: { status: "uploading", progress },
            }));
          },
        )) as { image?: ShopVariantOptionImage; error?: string };
        if (!data.image) throw new Error(data.error || "Upload failed.");
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "done", progress: 100 },
        }));
        setVariantOptionImages((current) => [...current, data.image!]);
      } catch (error) {
        setUploadState((current) => ({
          ...current,
          [tempKey]: { status: "error", progress: 0 },
        }));
        throw error;
      }
    },
    [ensureProductId],
  );

  const updateVariantOptionImage = useCallback(
    async (
      imageId: string,
      patch: { alt_text?: string; is_primary?: boolean },
    ) => {
      const id = form.productRef.current.id;
      if (!id) return;
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variant-images`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_id: imageId, ...patch }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        image?: ShopVariantOptionImage;
        error?: string;
      };
      const updatedImage = data.image;
      if (!response.ok || !updatedImage)
        throw new Error(data.error || "Failed to update image.");
      setVariantOptionImages((current) =>
        current.map((image) => {
          if (image.id !== imageId) {
            if (
              patch.is_primary === true &&
              image.option_name === updatedImage.option_name &&
              image.option_value === updatedImage.option_value
            ) {
              return { ...image, is_primary: false };
            }
            return image;
          }
          return updatedImage;
        }),
      );
    },
    [form],
  );

  const removeVariantOptionImage = useCallback(
    async (imageId: string) => {
      const id = form.productRef.current.id;
      if (!id) return;
      const response = await fetch(
        `/api/3d-shop/admin/products/${id}/variant-images?id=${encodeURIComponent(imageId)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to remove image.");
      setVariantOptionImages((current) =>
        current.filter((image) => image.id !== imageId),
      );
    },
    [form],
  );

  const reorderVariantOptionImages = useCallback(
    async (optionName: string, optionValue: string, orderedIds: string[]) => {
      const id = form.productRef.current.id;
      if (!id) return;
      setVariantOptionImages((current) =>
        current.map((image) =>
          image.option_name === optionName && image.option_value === optionValue
            ? {
                ...image,
                display_order: Math.max(0, orderedIds.indexOf(image.id)),
              }
            : image,
        ),
      );
      await Promise.all(
        orderedIds.map(async (imageId, index) => {
          const response = await fetch(
            `/api/3d-shop/admin/products/${id}/variant-images`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_id: imageId, display_order: index }),
            },
          );
          if (!response.ok) throw new Error("Failed to reorder images.");
        }),
      );
    },
    [form],
  );

  const addSkuImage = useCallback(async (skuId: string, file: File) => {
    const tempKey = `sku-${skuId}-${file.name}-${Date.now()}`;
    setUploadState((current) => ({
      ...current,
      [tempKey]: { status: "uploading", progress: 0 },
    }));
    try {
      const data = (await uploadFormFileWithProgress(
        `/api/3d-shop/admin/skus/${skuId}/images`,
        file,
        {},
        (progress) => {
          setUploadState((current) => ({
            ...current,
            [tempKey]: { status: "uploading", progress },
          }));
        },
      )) as { image?: ShopSkuImage; error?: string };
      const uploadedImage = data.image;
      if (!uploadedImage) throw new Error(data.error || "Upload failed.");
      setUploadState((current) => ({
        ...current,
        [tempKey]: { status: "done", progress: 100 },
      }));
      setSkuImages((current) => ({
        ...current,
        [skuId]: [...(current[skuId] ?? []), uploadedImage],
      }));
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        [tempKey]: { status: "error", progress: 0 },
      }));
      throw error;
    }
  }, []);

  const updateSkuImage = useCallback(
    async (
      imageId: string,
      patch: { alt_text?: string; is_primary?: boolean },
    ) => {
      const skuId = Object.entries(skuImagesRef.current).find(([, images]) =>
        images.some((image) => image.id === imageId),
      )?.[0];
      if (!skuId) return;
      const response = await fetch(`/api/3d-shop/admin/skus/${skuId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId, ...patch }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        image?: ShopSkuImage;
        error?: string;
      };
      const updatedSkuImage = data.image;
      if (!response.ok || !updatedSkuImage)
        throw new Error(data.error || "Failed to update image.");
      setSkuImages((current) => ({
        ...current,
        [skuId]: (current[skuId] ?? []).map((image) => {
          if (image.id === imageId) return updatedSkuImage;
          if (patch.is_primary === true) return { ...image, is_primary: false };
          return image;
        }),
      }));
    },
    [],
  );

  const removeSkuImage = useCallback(async (imageId: string) => {
    const skuId = Object.entries(skuImagesRef.current).find(([, images]) =>
      images.some((image) => image.id === imageId),
    )?.[0];
    if (!skuId) return;
    const response = await fetch(
      `/api/3d-shop/admin/skus/${skuId}/images?id=${encodeURIComponent(imageId)}`,
      {
        method: "DELETE",
      },
    );
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Failed to remove image.");
    setSkuImages((current) => ({
      ...current,
      [skuId]: (current[skuId] ?? []).filter((image) => image.id !== imageId),
    }));
  }, []);

  const reorderSkuImages = useCallback(
    async (skuId: string, orderedIds: string[]) => {
      setSkuImages((current) => ({
        ...current,
        [skuId]: (current[skuId] ?? []).map((image) => ({
          ...image,
          display_order: Math.max(0, orderedIds.indexOf(image.id)),
        })),
      }));
      await Promise.all(
        orderedIds.map(async (imageId, index) => {
          const response = await fetch(
            `/api/3d-shop/admin/skus/${skuId}/images`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_id: imageId, display_order: index }),
            },
          );
          if (!response.ok) throw new Error("Failed to reorder images.");
        }),
      );
    },
    [],
  );

  const archiveProduct = useCallback(async () => {
    const id = form.productRef.current.id;
    if (!id || !window.confirm("Archive this product?")) return;
    const response = await fetch(`/api/3d-shop/admin/products?id=${id}`, {
      method: "DELETE",
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      setToast({
        type: "error",
        message: data.error || "Failed to archive product.",
      });
      return;
    }
    setToast({ type: "success", message: "Product archived." });
    window.setTimeout(() => {
      router.push("/admin/3d-shop/products");
    }, 300);
  }, [form, router]);

  const value: ProductEditorContextValue = {
    mode,
    productId,
    product: form.product,
    errors: form.errors,
    touched: form.touched,
    canUndo: form.canUndo,
    canRedo: form.canRedo,
    dirty: form.dirty,
    saving,
    loading,
    categories,
    slugStatus: form.product.slug ? slugStatus : "idle",
    uploadState,
    variants,
    skus,
    variantDimensions,
    variantOptionImages,
    skuImages,
    defaultWeight,
    defaultCost,
    defaultCompareAt,
    skuSectionRef,
    dragImage,
    dragVariant,
    toast,
    publishBlockers,
    aiTone,
    aiBusy,
    updateProduct,
    markTouched: form.markTouched,
    undo: form.undo,
    redo: form.redo,
    markSlugTouched: () => {
      slugTouchedRef.current = true;
    },
    saveProduct,
    archiveProduct,
    setToast,
    setDragImage,
    setDragVariant,
    setAiTone,
    generateAi,
    generateAiField,
    generateAiSpecsRows,
    setDefaultWeight,
    setDefaultCost,
    setDefaultCompareAt,
    applyTemplate,
    duplicateProduct,
    revisions,
    restoreRevision,
    clearRevisionHistory,
    uploadImage,
    uploadBlockImage,
    uploadModel,
    removeModel,
    uploadProductAsset,
    removeProductAsset,
    uploadSkuModel,
    attachLibraryImage,
    setThumbnail,
    removeImage,
    handleImageDrop,
    setImageAlt,
    uploadLandscapeImage,
    removeLandscapeImage,
    assignToVariantOption,
    unassignVariantOptionImage,
    assignToSku,
    unassignSkuImage,
    clearSkuVariantImage,
    generateImageAlt,
    aiPrompt,
    setAiPrompt,
    addVariant,
    updateVariant,
    deleteVariant,
    reorderVariants,
    updateVariantValueMetadata,
    removeVariantValue,
    reorderVariantValues,
    pricingRules,
    addPricingRule,
    updatePricingRule,
    deletePricingRule,
    skuPatternTemplates,
    generateSkuPreview,
    generateSkus,
    tierPrices,
    updateTierPrices,
    generateSkuQr,
    updateSku,
    bulkUpdateSkus,
    saveAllSkus: saveAllSkusWithToast,
    deleteSku,
    updateVariantDimension,
    deleteVariantDimension,
    applyDefaultDimensionsToUnset,
    addVariantOptionImage,
    updateVariantOptionImage,
    removeVariantOptionImage,
    reorderVariantOptionImages,
    addSkuImage,
    updateSkuImage,
    removeSkuImage,
    reorderSkuImages,
  };

  return (
    <ProductEditorContext.Provider value={value}>
      {children}
    </ProductEditorContext.Provider>
  );
}
