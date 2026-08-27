"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Link2,
  MessageCircle,
  Pencil,
  Play,
  RefreshCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  ThumbsDown,
  ThumbsUp,
  Truck,
} from "lucide-react";
import { addToast } from "@/lib/toast/store";
import ShopVariantControls from "@/components/shop/ShopVariantControls";
import QuantityStepper from "@/components/shop/QuantityStepper";
import NotifyMeForm from "@/components/shop/NotifyMeForm";
import ProductRecommendations from "@/components/shop/ProductRecommendations";
import ReviewModal, {
  type ReviewEligibility,
} from "@/components/shop/ReviewModal";
import WishlistButton from "@/components/shop/WishlistButton";
import ProductModelModal from "@/components/shop/ProductModelModal";
import ARViewButton from "@/components/shop/ARViewButton";
import type { AppUserProfile } from "@/lib/auth/server";
import type { ProductDimensions } from "@/lib/shop/admin-types";
import type { DescriptionBlocks } from "@/lib/shop/blocks";
import type {
  ShopPublicProduct,
  ShopPublicReview,
} from "@/lib/shop/public-types";
import { convertWeight, displayDimensions } from "@/lib/shop/dimensions";
import {
  formatShopPrice,
  formatVariantLabel,
  getDefaultShopSelection,
  getShopDisplayDimensions,
  getShopGalleryImages,
  getShopProductImages,
  getShopStockLabel,
  resolveShopSku,
  getSelectedSwatchColor,
  type ShopSelectedOptions,
} from "@/lib/shop/selection";
import { addRecentlyViewed } from "@/lib/shop/recentlyViewed";
import { useShopCartStore } from "@/stores/shopCartStore";
import { trackMetaEvent } from "@/lib/meta/event-utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { sanitizeShopRichHtml } from "@/lib/shop/rich-text";
import LuxuryDescriptionBlocks from "@/components/shop/blocks/LuxuryDescriptionBlocks";

function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}

function useEscape(handler: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handler();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler, active]);
}

function canHoverZoom() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index + 1 <= Math.round(value) ? "fill-[var(--shop-gold)] text-[var(--shop-gold)]" : "text-[var(--shop-border-medium)]"}`}
        />
      ))}
    </div>
  );
}

function SpecificationsSection({
  skuCode,
  weightGrams,
  dimensions,
}: {
  skuCode: string | null;
  weightGrams: number | null;
  dimensions: ProductDimensions | null;
}) {
  const dims = displayDimensions(dimensions);
  const weightValue =
    dimensions?.weight_g != null
      ? `${convertWeight(dimensions.weight_g, dimensions.weight_unit)} ${dimensions.weight_unit}`
      : weightGrams
        ? `${weightGrams} grams`
        : null;
  const volumeValue =
    dimensions?.volume_cc != null ? `${dimensions.volume_cc} cc` : null;
  const rows = [
    { label: "SKU", value: skuCode ?? "Select options" },
    { label: "Dimensions", value: dims.dimensionText ?? "Select options" },
    { label: "Weight", value: weightValue ?? "Select options" },
    { label: "Volume", value: volumeValue ?? "Select options" },
  ];
  return (
    <section className="mx-auto max-w-5xl">
      <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)] md:text-3xl">
        Specifications
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="group relative overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-gold)] bg-white/50 p-5 backdrop-blur-sm transition duration-300 hover:shadow-[var(--shop-shadow-md)]"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-[var(--shop-gradient-gold)] transition-transform duration-300 group-hover:scale-x-100" />
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--shop-text-muted)]">
              {row.label}
            </dt>
            <dd className="mt-2 text-sm font-medium text-[var(--shop-text-primary)]">
              {row.value}
            </dd>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShippingSection() {
  const items = [
    { title: "Dispatch", body: "Orders are shipped within 1-2 business days." },
    {
      title: "Delivery",
      body: "Standard delivery: 4-7 business days across India.",
    },
    { title: "Returns", body: "Easy 7-day return policy on unused items." },
  ];
  return (
    <section className="mx-auto max-w-5xl">
      <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)] md:text-3xl">
        Shipping & Returns
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-5"
          >
            <h3 className="font-semibold text-[var(--shop-text-primary)]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--shop-text-secondary)]">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductStory({
  description,
  longDescription,
  blocks,
  skuCode,
  weightGrams,
  dimensions,
}: {
  description: string;
  longDescription: string | null;
  blocks: DescriptionBlocks | null;
  skuCode: string | null;
  weightGrams: number | null;
  dimensions: ProductDimensions | null;
}) {
  const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
  const hasHtml = Boolean(longDescription?.trim());
  const hasSpecsBlock =
    hasBlocks && blocks.some((block) => block.type === "specs_table");
  return (
    <div className="space-y-20 md:space-y-24">
      {hasBlocks ? (
        <LuxuryDescriptionBlocks blocks={blocks} />
      ) : hasHtml ? (
        <section className="mx-auto max-w-3xl">
          <div
            className="prose prose-sm max-w-none leading-7 text-[var(--shop-text-secondary)] md:prose-base"
            dangerouslySetInnerHTML={{
              __html: sanitizeShopRichHtml(longDescription ?? ""),
            }}
          />
        </section>
      ) : (
        <section className="mx-auto max-w-3xl">
          <p className="text-sm leading-7 text-[var(--shop-text-secondary)]">
            {description || "Details coming soon."}
          </p>
        </section>
      )}
      {!hasSpecsBlock && (
        <SpecificationsSection
          skuCode={skuCode}
          weightGrams={weightGrams}
          dimensions={dimensions}
        />
      )}
      <ShippingSection />
    </div>
  );
}

export default function ShopProductDetailClient({
  product,
  initialReviews,
  currentUser,
}: {
  product: ShopPublicProduct;
  initialReviews: ShopPublicReview[];
  currentUser: AppUserProfile | null;
}) {
  const router = useRouter();
  const addItem = useShopCartStore((state) => state.addItem);
  const openCart = useShopCartStore((state) => state.openCart);
  const baseImages = useMemo(() => getShopProductImages(product), [product]);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const draggingRef = useRef(false);
  // Pre-select the cheapest purchasable variant on load — enterprise PDPs
  // never show an ambiguous "From ₹X" / "Select options" first paint.
  const [selected, setSelected] = useState<ShopSelectedOptions>(() =>
    getDefaultShopSelection(product),
  );
  const gallery = useMemo(
    () => getShopGalleryImages(product, selected),
    [product, selected],
  );
  const images = gallery.images;
  // Unified gallery media: images plus the hero video inserted right after
  // the cover shot so the video sits in the natural browsing flow.
  const mediaItems = useMemo<{ type: "video" | "image"; src: string }[]>(() => {
    const items: { type: "video" | "image"; src: string }[] = images.map(
      (src) => ({ type: "image", src }),
    );
    if (product.hero_video_url) {
      items.splice(Math.min(1, items.length), 0, {
        type: "video",
        src: product.hero_video_url,
      });
    }
    return items;
  }, [images, product.hero_video_url]);
  const [mediaPos, setMediaPos] = useState(0);
  const safeMediaPos = Math.min(mediaPos, Math.max(0, mediaItems.length - 1));
  const activeMedia = mediaItems[safeMediaPos] ?? null;
  const [customizationText, setCustomizationText] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [reviews, setReviews] = useState(initialReviews);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSort, setReviewSort] = useState<
    "newest" | "highest" | "lowest" | "helpful"
  >("newest");
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ShopPublicReview | null>(
    null,
  );
  const [reviewEligibility, setReviewEligibility] =
    useState<ReviewEligibility | null>(null);
  const [reviewStatus, setReviewStatus] = useState<
    "loading" | "eligible" | "not_purchased" | "reviewed" | "guest"
  >(currentUser ? "loading" : "guest");
  const [toast, setToast] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxDir, setLightboxDir] = useState<1 | -1>(1);
  const [modelOpen, setModelOpen] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  useScrollLock(Boolean(lightboxImage) || modelOpen);
  useEscape(() => setLightboxImage(null), Boolean(lightboxImage));

  const resolvedSku = useMemo(
    () => resolveShopSku(product.skus, product.variant_options, selected),
    [product, selected],
  );
  const productDimensions = useMemo(
    () => getShopDisplayDimensions(product, selected),
    [product, selected],
  );
  const activeModelUrl = resolvedSku?.model_url || product.model_url || null;
  const tintColor = useMemo(
    () => getSelectedSwatchColor(product.variant_options, selected),
    [product.variant_options, selected],
  );
  // Hero follows the gallery media sequence exactly — the main stage and
  // thumbnail strip can never disagree.
  const visibleImage =
    activeMedia?.type === "image" ? activeMedia.src : baseImages[0] || "";

  const gallerySignature = `${gallery.source}|${images.join(",")}`;
  const [seenGallery, setSeenGallery] = useState(gallerySignature);
  if (seenGallery !== gallerySignature) {
    setSeenGallery(gallerySignature);
    setMediaPos(0);
  }

  function goImage(dir: 1 | -1) {
    if (mediaItems.length < 2) return;
    const next = Math.min(
      Math.max(safeMediaPos + dir, 0),
      mediaItems.length - 1,
    );
    if (next === safeMediaPos) return;
    setSlideDir(dir);
    setMediaPos(next);
  }

  function goLightboxImage(dir: 1 | -1) {
    if (images.length < 2) return;
    const idx = lightboxImage ? Math.max(0, images.indexOf(lightboxImage)) : 0;
    const next = Math.min(Math.max(idx + dir, 0), images.length - 1);
    if (next === idx) return;
    setLightboxDir(dir);
    setLightboxImage(images[next]);
  }
  const stock = getShopStockLabel(resolvedSku);
  const maxStock = resolvedSku?.pre_order_eta
    ? 10
    : (resolvedSku?.stock_quantity ?? 1);
  const canAdd = Boolean(
    resolvedSku &&
    resolvedSku.is_available !== false &&
    (resolvedSku.stock_quantity > 0 || resolvedSku.pre_order_eta),
  );
  const isTrulyOutOfStock = Boolean(
    resolvedSku &&
    resolvedSku.stock_quantity <= 0 &&
    !resolvedSku.pre_order_eta,
  );
  const price = resolvedSku?.price ?? product.display_price;
  const compareAt = resolvedSku?.compare_at_price ?? product.compare_at_price;
  const savings = compareAt && compareAt > price ? compareAt - price : 0;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: product.review_distribution[rating as 1 | 2 | 3 | 4 | 5] ?? 0,
  }));
  const totalReviews = product.review_count;

  useEffect(() => {
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      slug: product.slug,
      thumbnail_url: product.thumbnail_url,
      base_price: product.base_price,
    });
  }, [
    product.base_price,
    product.id,
    product.name,
    product.slug,
    product.thumbnail_url,
  ]);

  useEffect(() => {
    trackMetaEvent("ViewContent", {
      content_ids: product.skus.map((s) => s.sku_code),
      content_type: "product_group",
      contents: product.skus.map((s) => ({
        id: s.sku_code,
        quantity: 1,
        item_price: s.price,
      })),
      value: product.display_price,
      currency: "INR",
    });
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    async function loadReviewEligibility() {
      try {
        const response = await fetch(
          `/api/3d-shop/reviews/eligible?productId=${product.id}`,
        );
        const data = (await response.json().catch(() => ({}))) as {
          eligible?: ReviewEligibility | null;
          hasDeliveredPurchase?: boolean;
          alreadyReviewed?: boolean;
        };
        if (!active) return;
        if (response.ok && data.eligible) {
          setReviewEligibility(data.eligible);
          setReviewStatus("eligible");
        } else if (data.alreadyReviewed) {
          setReviewStatus("reviewed");
        } else {
          setReviewStatus("not_purchased");
        }
      } catch {
        if (active) setReviewStatus("not_purchased");
      }
    }
    void loadReviewEligibility();
    return () => {
      active = false;
    };
  }, [currentUser, product.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function addCurrentToCart(goToCheckout = false) {
    if (!resolvedSku || !canAdd) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      categoryId: product.category_id,
      categoryName: product.category_name,
      categorySlug: product.category_slug,
      thumbnail:
        resolvedSku.variant_image_url ||
        product.thumbnail_url ||
        images[0] ||
        "",
      skuId: resolvedSku.id,
      skuCode: resolvedSku.sku_code,
      variantCombination: resolvedSku.variant_combination,
      variantLabel: formatVariantLabel(resolvedSku.variant_combination),
      customizationText,
      price: resolvedSku.price,
      compareAtPrice: resolvedSku.compare_at_price,
      quantity,
      maxStock,
    });
    trackMetaEvent("AddToCart", {
      content_ids: [resolvedSku.sku_code],
      content_type: "product",
      contents: [
        { id: resolvedSku.sku_code, quantity, item_price: resolvedSku.price },
      ],
      value: resolvedSku.price * quantity,
      currency: "INR",
    });
    addToast({
      type: "success",
      title: "Added to cart",
      description: `${product.name}`,
    });
    if (goToCheckout) {
      router.push("/3d-shop/checkout");
    }
  }

  async function checkPincode() {
    if (!/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus("Enter a valid 6-digit pincode.");
      return;
    }
    setCheckingPincode(true);
    try {
      const response = await fetch(`/api/3d-shop/pincode/${pincode.trim()}`);
      const data = (await response.json()) as {
        serviceable?: boolean;
        city?: string;
        state?: string;
      };
      setPincodeStatus(
        data.serviceable
          ? `Delivered to ${data.city}${data.state ? `, ${data.state}` : ""} · Estimated 4-7 days`
          : "Not deliverable to this pincode",
      );
    } catch {
      setPincodeStatus("Could not check this pincode.");
    } finally {
      setCheckingPincode(false);
    }
  }

  async function loadReviews(
    page: number,
    sort: typeof reviewSort,
    append = false,
  ) {
    setLoadingReviews(true);
    try {
      const response = await fetch(
        `/api/3d-shop/products/${product.slug}/reviews?page=${page}&limit=10&sort=${sort}`,
      );
      const data = (await response.json()) as {
        reviews?: ShopPublicReview[];
        total?: number;
      };
      setReviews((current) =>
        append ? [...current, ...(data.reviews ?? [])] : (data.reviews ?? []),
      );
      setReviewPage(page);
    } finally {
      setLoadingReviews(false);
    }
  }

  async function loadMoreReviews() {
    await loadReviews(reviewPage + 1, reviewSort, true);
  }

  async function changeSort(newSort: typeof reviewSort) {
    setReviewSort(newSort);
    await loadReviews(1, newSort, false);
  }

  async function voteReview(reviewId: string, isHelpful: boolean) {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/3d-shop/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHelpful }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        helpful?: number;
        notHelpful?: number;
        userVote?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Vote failed.");
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                helpful_count: data.helpful ?? review.helpful_count,
                not_helpful_count: data.notHelpful ?? review.not_helpful_count,
                user_vote: data.userVote ?? null,
              }
            : review,
        ),
      );
    } catch (voteError) {
      addToast({
        type: "error",
        title: "Vote failed",
        description:
          voteError instanceof Error
            ? voteError.message
            : "Could not record your vote.",
      });
    }
  }

  function renderReviewAction() {
    if (reviewStatus === "guest") {
      return (
        <button
          type="button"
          onClick={() =>
            router.push(
              `/login?next=${encodeURIComponent(`/3d-shop/product/${product.slug}`)}`,
            )
          }
          className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-4 text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
        >
          Login to Write a Review
        </button>
      );
    }
    if (reviewStatus === "eligible") {
      return (
        <button
          type="button"
          onClick={() => setReviewModalOpen(true)}
          className="min-h-[44px] rounded-xl bg-[var(--shop-gold)] px-4 text-sm font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]"
        >
          Write a Review
        </button>
      );
    }
    if (reviewStatus === "reviewed") {
      return (
        <div className="min-h-[44px] rounded-xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-3 text-sm font-semibold text-[var(--shop-gold)]">
          You&apos;ve reviewed this product ✓
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled
        title={
          reviewStatus === "loading"
            ? "Checking eligibility"
            : "Purchase this product to leave a review"
        }
        className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] px-4 text-sm font-semibold text-[var(--shop-text-muted)] opacity-60"
      >
        {reviewStatus === "loading" ? "Checking..." : "Write a Review"}
      </button>
    );
  }

  return (
    <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
      {toast && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[130] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--shop-border-light)] bg-white px-4 py-3 text-sm font-semibold text-[var(--shop-text-primary)] shadow-xl sm:right-5 sm:max-w-sm sm:bottom-5">
          {toast}
        </div>
      )}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[140] grid place-items-center bg-[var(--shop-text-primary)]/85 p-4 backdrop-blur-md"
            onClick={() => setLightboxImage(null)}
          >
            <button
              type="button"
              aria-label="Close image preview"
              className="absolute inset-0"
              onClick={() => setLightboxImage(null)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 aspect-square max-h-[85dvh] w-full max-w-3xl overflow-hidden rounded-[var(--shop-radius-xl)] bg-white"
              onClick={(event) => event.stopPropagation()}
            >
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragStart={() => {
                  draggingRef.current = true;
                }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -42) goLightboxImage(1);
                  else if (info.offset.x > 42) goLightboxImage(-1);
                  window.setTimeout(() => {
                    draggingRef.current = false;
                  }, 80);
                }}
                className="absolute inset-0 cursor-grab touch-pan-y select-none"
              >
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={lightboxImage}
                    initial={{ opacity: 0, x: 26 * lightboxDir }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -26 * lightboxDir }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={lightboxImage}
                      alt="Review image"
                      fill
                      sizes="90vw"
                      className="object-contain"
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => goLightboxImage(-1)}
                    className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-[var(--shop-text-primary)] shadow-lg backdrop-blur transition hover:bg-white active:scale-95"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => goLightboxImage(1)}
                    className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-[var(--shop-text-primary)] shadow-lg backdrop-blur transition hover:bg-white active:scale-95"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl">
        <nav className="mb-6 flex flex-wrap gap-2 text-sm text-[var(--shop-text-muted)]">
          <Link href="/" className="transition hover:text-[var(--shop-gold)]">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/3d-shop"
            className="transition hover:text-[var(--shop-gold)]"
          >
            3D Shop
          </Link>
          {product.category_slug && (
            <>
              <span>/</span>
              <Link
                href={`/3d-shop/category/${product.category_slug}`}
                className="transition hover:text-[var(--shop-gold)]"
              >
                {product.category_name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[var(--shop-text-primary)]">
            {product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_520px]">
          <section className="min-w-0">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
              onDragStart={() => {
                draggingRef.current = true;
              }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -42) goImage(1);
                else if (info.offset.x > 42) goImage(-1);
                window.setTimeout(() => {
                  draggingRef.current = false;
                }, 80);
              }}
              className={`touch-pan-y select-none ${activeMedia?.type === "image" ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              {activeMedia?.type === "video" ? (
                // Inline player with controls — sound-on playback, Nike/Samsung style.
                <div className="relative aspect-square w-full overflow-hidden rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-black shadow-[var(--shop-shadow-sm)]">
                  <video
                    key={activeMedia.src}
                    src={activeMedia.src}
                    controls
                    playsInline
                    preload="metadata"
                    poster={baseImages[0] || undefined}
                    aria-label={`${product.name} showcase video`}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="View larger image"
                  onClick={() => {
                    if (!draggingRef.current && visibleImage)
                      setLightboxImage(visibleImage);
                  }}
                  onKeyDown={(event) => {
                    if (
                      (event.key === "Enter" || event.key === " ") &&
                      !draggingRef.current &&
                      visibleImage
                    ) {
                      event.preventDefault();
                      setLightboxImage(visibleImage);
                    }
                  }}
                  onMouseEnter={() => {
                    if (canHoverZoom()) setZoomEnabled(true);
                  }}
                  onMouseMove={(event) => {
                    if (!zoomEnabled || draggingRef.current) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    setZoomOrigin(
                      `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}% ${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`,
                    );
                  }}
                  onMouseLeave={() => setZoomEnabled(false)}
                  className="relative aspect-square w-full overflow-hidden rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white shadow-[var(--shop-shadow-sm)] transition hover:shadow-[var(--shop-shadow-md)]"
                >
                  {visibleImage ? (
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={visibleImage}
                        initial={{ opacity: 0, x: 24 * slideDir }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 * slideDir }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0"
                      >
                        <div
                          className="absolute inset-0 transition-transform duration-200 ease-out"
                          style={{
                            transform: zoomEnabled ? "scale(1.7)" : "scale(1)",
                            transformOrigin: zoomOrigin,
                          }}
                        >
                          <Image
                            src={visibleImage}
                            alt={
                              gallery.caption
                                ? `${product.name} — ${gallery.caption}`
                                : product.name
                            }
                            fill
                            priority
                            sizes="(min-width: 1024px) 55vw, 100vw"
                            className="object-cover"
                          />
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="grid h-full place-items-center text-6xl text-[var(--shop-text-subtle)]">
                      🧩
                    </div>
                  )}
                </div>
              )}
            </motion.div>
            {mediaItems.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-1.5 lg:hidden">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.type}-${item.src}`}
                    type="button"
                    aria-label={`Go to ${item.type === "video" ? "video" : `image ${index + 1}`}`}
                    onClick={() => setMediaPos(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${index === safeMediaPos ? "w-5 bg-[var(--shop-gold)]" : "w-1.5 bg-[var(--shop-border-medium)]"}`}
                  />
                ))}
              </div>
            )}
            {mediaItems.length > 1 && (
              <div className="mt-4 flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-padding-x-1 scrollbar-hide [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.type}-${item.src}`}
                    type="button"
                    onClick={() => setMediaPos(index)}
                    aria-label={
                      item.type === "video"
                        ? `Play product video`
                        : `View product image ${index + 1}`
                    }
                    className={`relative aspect-square w-[72px] shrink-0 snap-start overflow-hidden rounded-2xl border bg-white transition hover:border-[var(--shop-border-gold)] active:scale-95 ${safeMediaPos === index ? "border-[var(--shop-gold)] ring-2 ring-[var(--shop-gold)]/25" : "border-[var(--shop-border-light)]"}`}
                  >
                    {item.type === "video" ? (
                      <>
                        <span className="absolute inset-0 grid place-items-center bg-black">
                          <Play className="h-6 w-6 fill-white text-white" />
                        </span>
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                          Video
                        </span>
                      </>
                    ) : (
                      <Image
                        src={item.src}
                        alt={product.name}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
            {gallery.caption && mediaItems.length > 1 && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">
                Showing: {gallery.caption}
              </p>
            )}
            {activeModelUrl && (
              <button
                type="button"
                onClick={() => setModelOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-3 text-sm font-semibold text-[var(--shop-gold)] transition hover:border-[var(--shop-gold)] hover:bg-[var(--shop-gold-soft)]"
              >
                <Box className="h-4 w-4" />
                View interactive 3D preview
              </button>
            )}
            {product.usdz_url && activeModelUrl && (
              <div className="mt-2">
                <ARViewButton
                  usdzUrl={product.usdz_url}
                  glbUrl={activeModelUrl}
                />
              </div>
            )}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] md:p-6">
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-[var(--shop-font-heading)] min-w-0 !text-xl font-semibold leading-snug text-[var(--shop-text-primary)] md:!text-2xl">
                  {product.name}
                </h1>
                <WishlistButton
                  productId={product.id}
                  label
                  className="shrink-0 rounded-xl border-[var(--shop-border-light)]"
                />
              </div>

              {product.review_count > 0 && (
                <a
                  href="#reviews"
                  className="mt-3 flex items-center gap-2 text-sm text-[var(--shop-text-muted)] transition hover:text-[var(--shop-gold)]"
                >
                  <Stars value={product.avg_rating} />
                  <span>({product.review_count} reviews)</span>
                </a>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {compareAt && compareAt > price ? (
                  <>
                    <span className="text-xl text-[var(--shop-text-subtle)] line-through">
                      {formatShopPrice(compareAt)}
                    </span>
                    <span className="font-[var(--shop-font-heading)] text-3xl font-semibold text-[var(--shop-text-primary)]">
                      {formatShopPrice(price)}
                    </span>
                    <span className="rounded-full bg-[var(--shop-gold-faint)] px-3 py-1 text-xs font-semibold text-[var(--shop-gold)]">
                      Save {formatShopPrice(savings)}
                    </span>
                  </>
                ) : (
                  <span className="font-[var(--shop-font-heading)] text-3xl font-semibold text-[var(--shop-text-primary)]">
                    {resolvedSku
                      ? formatShopPrice(price)
                      : `From ${formatShopPrice(price)}`}
                  </span>
                )}
              </div>

              {price > 0 && (
                <p className="mt-1.5 text-xs font-medium text-[var(--shop-text-muted)]">
                  or {formatShopPrice(Math.round(price / 12))}/mo. with EMI ·
                  Inclusive of all taxes
                </p>
              )}

              <div className="mt-6">
                <ShopVariantControls
                  options={product.variant_options}
                  selected={selected}
                  onChangeAction={(name, value) =>
                    setSelected((current) => ({ ...current, [name]: value }))
                  }
                />
              </div>

              {productDimensions && (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--shop-text-secondary)]">
                    {(() => {
                      const dims = displayDimensions(productDimensions);
                      const weight =
                        productDimensions.weight_g != null
                          ? `${convertWeight(productDimensions.weight_g, productDimensions.weight_unit)} ${productDimensions.weight_unit}`
                          : null;
                      const parts = [dims.dimensionText, weight].filter(
                        Boolean,
                      ) as string[];
                      return parts.length > 0 ? (
                        <>
                          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">
                            Size
                          </span>
                          <span className="rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-3 py-1.5 font-medium text-[var(--shop-text-primary)]">
                            {parts.join(" · ")}
                          </span>
                        </>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {resolvedSku === null &&
                product.skus.length > 0 &&
                product.variant_options.length > 0 && (
                  <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                    This combination is not available
                  </p>
                )}

              <p
                className={`mt-5 rounded-xl px-3 py-2 text-sm font-semibold ${
                  stock.tone === "green"
                    ? "bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]"
                    : stock.tone === "amber"
                      ? "bg-amber-50 text-amber-700"
                      : stock.tone === "red"
                        ? "bg-red-50 text-red-700"
                        : stock.tone === "blue"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-[var(--shop-bg-soft)] text-[var(--shop-text-muted)]"
                }`}
              >
                {stock.label}
              </p>

              {product.is_customizable && (
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-sm font-semibold text-[var(--shop-text-primary)]">
                    {product.customization_label || "Customization"}
                  </span>
                  <input
                    value={customizationText}
                    maxLength={50}
                    onChange={(event) =>
                      setCustomizationText(event.target.value)
                    }
                    className="min-h-[44px] w-full rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
                  />
                  <span className="mt-1 block text-xs text-[var(--shop-text-muted)]">
                    This will be used for personalization ·{" "}
                    {customizationText.length}/50
                  </span>
                </label>
              )}

              {canAdd && (
                <div className="mt-5">
                  <QuantityStepper
                    value={quantity}
                    max={maxStock}
                    onChangeAction={setQuantity}
                  />
                </div>
              )}

              <form
                className="mt-5 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void checkPincode();
                }}
              >
                <input
                  value={pincode}
                  onChange={(event) =>
                    setPincode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="Check delivery to your pincode"
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
                />
                <button
                  type="submit"
                  disabled={checkingPincode}
                  className="rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-4 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  Check
                </button>
              </form>
              {pincodeStatus && (
                <p
                  className={`mt-2 text-sm font-semibold ${pincodeStatus.includes("Delivered") ? "text-[var(--shop-gold)]" : "text-[var(--shop-text-secondary)]"}`}
                >
                  {pincodeStatus}
                </p>
              )}

              {isTrulyOutOfStock && resolvedSku ? (
                <NotifyMeForm
                  productId={product.id}
                  skuId={resolvedSku.id}
                  variantLabel={formatVariantLabel(
                    resolvedSku.variant_combination,
                  )}
                  initialEmail={currentUser?.email ?? ""}
                />
              ) : (
                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addCurrentToCart(false)}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] text-base font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addCurrentToCart(true)}
                    className="min-h-[52px] rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] text-base font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Buy Now
                  </button>
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { icon: ShieldCheck, label: "QA checked" },
                  { icon: Truck, label: "4-7 day delivery" },
                  { icon: RefreshCcw, label: "7-day returns" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 text-center"
                  >
                    <item.icon className="h-4 w-4 text-[var(--shop-gold)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-[var(--shop-border-light)] pt-4">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">
                  Share
                </span>
                <button
                  type="button"
                  aria-label="Share on WhatsApp"
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`${product.name} — ${window.location.href}`)}`,
                      "_blank",
                      "noopener",
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--shop-border-light)] text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Share on X"
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(window.location.href)}`,
                      "_blank",
                      "noopener",
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--shop-border-light)] text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Copy product link"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      setToast("Link copied to clipboard.");
                    } catch {
                      setToast("Could not copy the link.");
                    }
                  }}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--shop-border-light)] text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-16">
          <ProductStory
            description={product.description ?? ""}
            longDescription={product.long_description}
            blocks={product.long_description_blocks}
            skuCode={resolvedSku?.sku_code ?? null}
            weightGrams={resolvedSku?.weight_grams ?? null}
            dimensions={productDimensions}
          />
        </div>

        <section
          id="reviews"
          className="mt-20 rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] md:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">
                Customer Reviews
              </h2>
              <p className="mt-2 text-sm font-medium text-[var(--shop-text-muted)]">
                {totalReviews > 0
                  ? `Based on ${totalReviews} review${totalReviews === 1 ? "" : "s"}`
                  : "No reviews yet."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {totalReviews > 0 && (
                <select
                  value={reviewSort}
                  onChange={(e) =>
                    void changeSort(e.target.value as typeof reviewSort)
                  }
                  className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-3 text-sm font-semibold text-[var(--shop-text-secondary)] outline-none focus:border-[var(--shop-gold)]"
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest Rated</option>
                  <option value="lowest">Lowest Rated</option>
                  <option value="helpful">Most Helpful</option>
                </select>
              )}
              {renderReviewAction()}
            </div>
          </div>

          {totalReviews > 0 ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
              <div>
                <div className="rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-5">
                  <div className="font-[var(--shop-font-heading)] text-5xl font-semibold text-[var(--shop-text-primary)]">
                    {product.avg_rating.toFixed(1)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={product.avg_rating} />
                    <span className="text-sm font-medium text-[var(--shop-text-muted)]">
                      Based on {totalReviews} reviews
                    </span>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {distribution.map((item) => (
                    <div
                      key={item.rating}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-8 font-medium text-[var(--shop-text-secondary)]">
                        {item.rating}★
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--shop-bg-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--shop-gold)]"
                          style={{
                            width: `${totalReviews ? (item.count / totalReviews) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-[var(--shop-text-muted)]">
                        {totalReviews
                          ? Math.round((item.count / totalReviews) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Stars value={review.rating} />
                          {review.is_verified_purchase && (
                            <span className="rounded-full bg-[var(--shop-gold-faint)] px-2 py-0.5 text-[10px] font-bold text-[var(--shop-gold)]">
                              Verified Purchase
                            </span>
                          )}
                          {review.updated_at &&
                            review.updated_at !== review.created_at && (
                              <span className="text-[10px] font-bold text-[var(--shop-text-muted)]">
                                Edited
                              </span>
                            )}
                        </div>
                        <h3 className="mt-2 font-semibold text-[var(--shop-text-primary)]">
                          {review.title || "Review"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentUser?.id === review.user_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReview(review);
                              setReviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--shop-border-light)] bg-white px-2 py-1 text-xs font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                        <div className="text-xs text-[var(--shop-text-muted)]">
                          {review.created_at
                            ? new Intl.DateTimeFormat("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }).format(new Date(review.created_at))
                            : ""}
                        </div>
                      </div>
                    </div>
                    {review.body && (
                      <p className="mt-3 text-sm leading-7 text-[var(--shop-text-secondary)]">
                        {review.body}
                      </p>
                    )}
                    {review.image_urls.length > 0 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto">
                        {review.image_urls.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--shop-border-light)] bg-white"
                          >
                            <Image
                              src={url}
                              alt="Review image"
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-[var(--shop-text-muted)]">
                        {review.reviewer_name}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void voteReview(review.id, true)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                            review.user_vote === true
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)] hover:text-[var(--shop-text-primary)]"
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {review.helpful_count > 0
                            ? review.helpful_count
                            : "Helpful"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void voteReview(review.id, false)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                            review.user_vote === false
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)] hover:text-[var(--shop-text-primary)]"
                          }`}
                        >
                          <ThumbsDown className="h-3 w-3" />
                          {review.not_helpful_count > 0
                            ? review.not_helpful_count
                            : "Not Helpful"}
                        </button>
                      </div>
                    </div>
                    {review.admin_reply && (
                      <div className="mt-3 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--shop-gold)]">
                          <MessageCircle className="h-3.5 w-3.5" />
                          Flux3D Team
                          {review.admin_replied_at && (
                            <span className="font-normal text-[var(--shop-text-muted)]">
                              {new Intl.DateTimeFormat("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }).format(new Date(review.admin_replied_at))}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--shop-text-secondary)]">
                          {review.admin_reply}
                        </p>
                      </div>
                    )}
                  </article>
                ))}
                {reviews.length < totalReviews && (
                  <button
                    type="button"
                    onClick={loadMoreReviews}
                    disabled={loadingReviews}
                    className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-4 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                  >
                    {loadingReviews ? "Loading..." : "Load more"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-[var(--shop-text-muted)]">
              No reviews yet.
            </p>
          )}
        </section>

        <ProductRecommendations
          title="You Might Also Like"
          productId={product.id}
          categoryId={product.category_id}
          limit={6}
        />
      </div>

      <ReviewModal
        open={reviewModalOpen}
        product={{
          id: product.id,
          name: product.name,
          thumbnailUrl: product.thumbnail_url,
        }}
        eligibility={reviewEligibility}
        existingReview={editingReview}
        onOpenChangeAction={(open) => {
          setReviewModalOpen(open);
          if (!open) setEditingReview(null);
        }}
        onSubmittedAction={(message) => {
          if (editingReview) {
            setEditingReview(null);
            setToast(message || "Review updated.");
            void loadReviews(1, reviewSort, false);
          } else {
            setReviewStatus("reviewed");
            setReviewEligibility(null);
            setToast(
              message || "Review submitted! It'll appear after approval.",
            );
          }
        }}
      />
      {activeModelUrl && (
        <ProductModelModal
          open={modelOpen}
          modelUrl={activeModelUrl}
          productName={product.name}
          hotspots={product.hotspots}
          tintColor={tintColor}
          onClose={() => setModelOpen(false)}
        />
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-[120] border-t border-[var(--shop-border-gold)] bg-white/95 px-4 py-3 shadow-[var(--shop-shadow-lg)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-muted)]">
            {visibleImage ? (
              <Image
                src={visibleImage}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--shop-text-primary)]">
              {product.name}
            </p>
            <p className="font-[var(--shop-font-heading)] text-sm font-semibold text-[var(--shop-text-primary)]">
              {formatShopPrice(price)}
            </p>
          </div>
          {!isTrulyOutOfStock && (
            <button
              type="button"
              disabled={!canAdd}
              onClick={() => addCurrentToCart(true)}
              className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--shop-gold)] px-4 text-sm font-semibold text-white shadow-[var(--shop-shadow-gold)] transition active:scale-[0.98] disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Add
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
