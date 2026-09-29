"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Box, ShoppingBag, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { addToast } from "@/lib/toast/store";
import type { ShopPublicProduct } from "@/lib/shop/public-types";
import {
  formatShopPrice,
  formatVariantLabel,
  getShopProductBadge,
  getShopProductImages,
} from "@/lib/shop/selection";
import { useShopCartStore } from "@/stores/shopCartStore";
import QuickAddModal from "@/components/shop/QuickAddModal";
import { trackMetaEvent } from "@/lib/meta/event-utils";
import WishlistButton from "@/components/shop/WishlistButton";

const ProductModelModal = dynamic(
  () => import("@/components/shop/ProductModelModal"),
  {
    ssr: false,
  },
);

export default function ProductCard({
  product,
  actionLabel = "Add",
  index = 0,
  className = "",
  displayMode = "standard",
}: {
  product: ShopPublicProduct;
  actionLabel?: string;
  index?: number;
  className?: string;
  displayMode?: "standard" | "home-shelf";
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelRequested, setModelRequested] = useState(false);
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const addItem = useShopCartStore((state) => state.addItem);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration guard
    setMounted(true);
  }, []);
  const images = getShopProductImages(product);
  const badge = getShopProductBadge(product);
  const directSku =
    product.variant_options.length === 0
      ? (product.skus.find((sku) => sku.is_available !== false) ?? null)
      : null;
  const canDirectAdd = Boolean(
    directSku && (directSku.stock_quantity > 0 || directSku.pre_order_eta),
  );
  const hasModel = Boolean(product.model_url);
  const isHomeShelf = displayMode === "home-shelf";
  const purchaseDisabled =
    !product.has_preorder &&
    (product.stock_status === "out_of_stock" ||
      product.stock_status === "unavailable");
  const categoryLabel =
    product.categories.find((category) => category.is_primary)?.name ||
    product.category_name ||
    product.categories[0]?.name ||
    "Flux3D collection";
  const availablePrices = product.skus
    .filter((sku) => sku.is_available !== false)
    .map((sku) => sku.price);
  const hasVariablePrice = new Set(availablePrices).size > 1;
  const status = (() => {
    if (product.stock_status === "pre_order" || product.has_preorder) {
      return { label: "Pre-order available", tone: "text-sky-700" };
    }
    if (product.stock_status === "low_stock" || product.is_low_stock) {
      return { label: "Low stock", tone: "text-amber-700" };
    }
    if (product.stock_status === "out_of_stock") {
      return { label: "Sold out", tone: "text-rose-700" };
    }
    if (product.stock_status === "unavailable") {
      return { label: "Unavailable", tone: "text-[var(--shop-text-muted)]" };
    }
    return { label: "In stock", tone: "text-emerald-700" };
  })();
  const optionLabel = product.is_customizable
    ? "Customizable"
    : product.variant_options.length > 0
      ? "Options available"
      : null;
  const resolvedActionLabel = isHomeShelf
    ? added
      ? "Added"
      : purchaseDisabled
        ? product.stock_status === "unavailable"
          ? "Unavailable"
          : "Sold out"
        : product.has_preorder
          ? "Pre-order"
          : product.variant_options.length > 0
            ? "Choose options"
            : "Add to cart"
    : added
      ? "Added"
      : actionLabel;

  function handleAdd() {
    if (purchaseDisabled) return;
    if (!directSku) {
      setQuickAddOpen(true);
      return;
    }
    if (!canDirectAdd) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      categoryId: product.category_id,
      categoryName: product.category_name,
      categorySlug: product.category_slug,
      thumbnail:
        directSku.variant_image_url || product.thumbnail_url || images[0] || "",
      skuId: directSku.id,
      skuCode: directSku.sku_code,
      catalogRetailerId: directSku.catalog_retailer_id ?? directSku.sku_code,
      variantCombination: directSku.variant_combination,
      variantLabel: formatVariantLabel(directSku.variant_combination),
      customizationText: "",
      price: directSku.price,
      compareAtPrice: directSku.compare_at_price,
      quantity: 1,
      maxStock: directSku.pre_order_eta ? 10 : directSku.stock_quantity,
    });
    setAdded(true);
    trackMetaEvent("AddToCart", {
      content_ids: [directSku.catalog_retailer_id ?? directSku.sku_code],
      content_type: "product",
      contents: [
        {
          id: directSku.catalog_retailer_id ?? directSku.sku_code,
          quantity: 1,
          item_price: directSku.price,
        },
      ],
      value: directSku.price,
      currency: "INR",
    });
    addToast({
      type: "success",
      title: "Added to cart",
      description: `${product.name} — ${formatShopPrice(directSku.price)}`,
    });
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <>
      <motion.article
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          duration: reduceMotion ? 0 : 0.5,
          delay: reduceMotion ? 0 : index * 0.06,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] shadow-[var(--shop-shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--shop-border-gold)] hover:shadow-[var(--shop-shadow-md)] focus-within:border-[var(--shop-border-gold)] motion-reduce:transform-none motion-reduce:transition-none ${className}`}
      >
        <WishlistButton
          productId={product.id}
          catalogRetailerId={
            directSku?.catalog_retailer_id ?? directSku?.sku_code
          }
          className="absolute right-3 top-3 z-10"
        />
        <Link
          href={`/3d-shop/product/${product.slug}`}
          className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--shop-gold)]"
          data-testid="product-card-link"
        >
          <div className="relative aspect-square overflow-hidden bg-[var(--shop-bg-muted)]">
            {images[0] ? (
              <Image
                src={images[0]}
                alt={product.image_alt?.[images[0]] || product.name}
                fill
                sizes={
                  isHomeShelf
                    ? "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 82vw"
                    : "(min-width: 1024px) 25vw, 50vw"
                }
                className="object-cover transition duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
              />
            ) : (
              <div className="grid h-full place-items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] text-2xl text-[var(--shop-text-subtle)]">
                  <Box className="h-6 w-6" />
                </div>
              </div>
            )}
            <div className="absolute left-0 top-0 p-3">
              {badge ? (
                <span className="rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)]/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)] shadow-[var(--shop-shadow-sm)] backdrop-blur-sm">
                  {badge}
                </span>
              ) : null}
            </div>
            {hasModel && (
              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--shop-border-gold)] bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)] shadow-[var(--shop-shadow-sm)] backdrop-blur-sm">
                  <Box className="h-3 w-3" aria-hidden="true" />
                  3D
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2 px-5 pt-5">
            {isHomeShelf ? (
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                {categoryLabel}
              </p>
            ) : null}
            <h3 className="font-[var(--shop-font-heading)] line-clamp-2 min-h-[44px] text-base font-semibold leading-snug text-[var(--shop-text-primary)]">
              {product.name}
            </h3>
            {product.review_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--shop-text-muted)]">
                <Star
                  className="h-3.5 w-3.5 fill-[var(--shop-gold)] text-[var(--shop-gold)]"
                  aria-hidden="true"
                />
                <span className="font-semibold text-[var(--shop-text-primary)]">
                  {product.avg_rating.toFixed(1)}
                </span>
                <span>({product.review_count})</span>
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[var(--shop-text-primary)]">
                {isHomeShelf && hasVariablePrice ? "From " : ""}
                {formatShopPrice(product.display_price)}
              </span>
              {product.has_sale && product.compare_at_price ? (
                <span className="text-sm text-[var(--shop-text-subtle)] line-through">
                  {formatShopPrice(product.compare_at_price)}
                </span>
              ) : null}
            </div>
            {isHomeShelf ? (
              <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
                <span className={status.tone}>{status.label}</span>
                {optionLabel ? (
                  <>
                    <span
                      className="h-1 w-1 rounded-full bg-[var(--shop-text-subtle)]"
                      aria-hidden="true"
                    />
                    <span className="text-[var(--shop-text-muted)]">
                      {optionLabel}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </Link>
        <div className="mt-auto px-5 pb-5 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                purchaseDisabled ||
                (product.variant_options.length === 0 && !canDirectAdd)
              }
              onClick={handleAdd}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] px-3 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-text-secondary)] hover:shadow-[var(--shop-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-gold)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {resolvedActionLabel}
            </button>
            {hasModel && (
              <button
                type="button"
                onClick={() => {
                  setModelRequested(true);
                  setModelOpen(true);
                }}
                onPointerEnter={() => {
                  void import("@/components/shop/ProductModelModal");
                }}
                aria-label="View 3D preview"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-3 text-sm font-semibold text-[var(--shop-gold)] transition hover:border-[var(--shop-gold)] hover:bg-[var(--shop-gold-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-gold)] focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <Box className="h-4 w-4" aria-hidden="true" />
                3D
              </button>
            )}
          </div>
        </div>
      </motion.article>
      {mounted &&
        createPortal(
          <QuickAddModal
            product={product}
            open={quickAddOpen}
            onOpenChangeAction={setQuickAddOpen}
          />,
          document.body,
        )}
      {mounted &&
        hasModel &&
        modelRequested &&
        product.model_url &&
        createPortal(
          <ProductModelModal
            open={modelOpen}
            modelUrl={product.model_url}
            productName={product.name}
            onClose={() => setModelOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}
