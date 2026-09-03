"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppliedCoupon, AppliedOffer } from "@/lib/cart/types";
import { calculatePricingWaterfall } from "@/lib/quote/pricing-waterfall";

type ShopCartSyncModule = typeof import("@/lib/cart/shop-cart-sync");

let shopCartSyncModulePromise: Promise<ShopCartSyncModule> | null = null;

function loadShopCartSync() {
  if (!shopCartSyncModulePromise) {
    shopCartSyncModulePromise = import("@/lib/cart/shop-cart-sync");
  }
  return shopCartSyncModulePromise;
}

export type ShopCartItem = {
  cartItemId: string;
  productId: string;
  productSlug: string;
  productName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  thumbnail: string;
  skuId: string;
  skuCode: string;
  /** The id used in the Meta catalog for this SKU (shortened if over 100 chars). */
  catalogRetailerId?: string;
  variantCombination: Record<string, string | boolean>;
  variantLabel: string;
  customizationText: string;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  maxStock: number;
  weightGrams?: number;
  available?: boolean;
  localOnly?: boolean;
};

export type ShopCartAddItem = Omit<ShopCartItem, "cartItemId">;

type ShopCartPersistedState = {
  items: ShopCartItem[];
  couponCode: string | null;
  discountAmount?: number;
  appliedCoupon: AppliedCoupon | null;
};

type ShopCartState = ShopCartPersistedState & {
  isCartOpen: boolean;
  appliedCoupon: AppliedCoupon | null;
  autoApplyOffer: AppliedOffer | null;
  isSyncing: boolean;
  priceChangedItemIds: string[];
  addItem: (item: ShopCartAddItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: AppliedCoupon | string) => void;
  removeCoupon: () => void;
  setAutoApplyOffer: (offer: AppliedOffer | null) => void;
  openCart: () => void;
  closeCart: () => void;
};

function clampQuantity(quantity: number, maxStock: number) {
  const upper = Math.max(1, maxStock || 1);
  return Math.min(Math.max(1, Math.floor(quantity)), upper);
}

function sameShopCartEntry(left: ShopCartItem, right: ShopCartAddItem) {
  return (
    left.skuId === right.skuId &&
    left.customizationText.trim() === right.customizationText.trim()
  );
}

type PromotionLike = {
  discount_type:
    "percentage" | "fixed_amount" | "free_shipping" | "buy_x_get_y";
  discount_value: number;
  max_discount: number | null;
  min_order_value: number;
  discount_amount: number;
  applicable_categories?: string[] | null;
  applicable_materials?: string[] | null;
  applicable_products?: string[] | null;
  free_shipping?: boolean;
};

type ShopCartTotalsState = Pick<
  ShopCartPersistedState,
  "items" | "discountAmount" | "couponCode"
> & {
  appliedCoupon?: AppliedCoupon | null;
  autoApplyOffer?: AppliedOffer | null;
};

function normalizePromotionToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function matchesAnyPromotionToken(
  requiredValues: string[] | null | undefined,
  candidates: unknown[],
) {
  if (!requiredValues?.length) {
    return true;
  }

  const normalizedCandidates = new Set(
    candidates.map(normalizePromotionToken).filter(Boolean),
  );

  return requiredValues.some((value) =>
    normalizedCandidates.has(normalizePromotionToken(value)),
  );
}

function isPromotionApplicableToShopCart(
  promotion: PromotionLike,
  currentItems: ShopCartItem[],
) {
  const categories = promotion.applicable_categories;
  const materials = promotion.applicable_materials;
  const products = promotion.applicable_products;

  if (!categories?.length && !materials?.length && !products?.length) {
    return true;
  }

  if (categories?.length) {
    const categoryCandidates = currentItems.flatMap((item) => [
      item.categoryId,
      item.categoryName,
      item.categorySlug,
    ]);

    if (!matchesAnyPromotionToken(categories, categoryCandidates)) {
      return false;
    }
  }

  if (materials?.length) {
    const materialCandidates = currentItems.flatMap((item) =>
      Object.entries(item.variantCombination).flatMap(([key, value]) => [
        key,
        value,
      ]),
    );

    if (!matchesAnyPromotionToken(materials, materialCandidates)) {
      return false;
    }
  }

  if (products?.length) {
    const productCandidates = currentItems.flatMap((item) => [
      item.productId,
      item.productSlug,
      item.productName,
      item.skuId,
      item.skuCode,
    ]);

    if (!matchesAnyPromotionToken(products, productCandidates)) {
      return false;
    }
  }

  return true;
}

function recalculateShopCoupon(
  coupon: AppliedCoupon | null,
  currentItems: ShopCartItem[],
  baseAmount: number,
) {
  if (!coupon) {
    return null;
  }

  if (!isPromotionApplicableToShopCart(coupon, currentItems)) {
    return null;
  }

  if (baseAmount < (coupon.min_order_value ?? 0)) {
    return null;
  }

  return {
    ...coupon,
    discount_amount: 0,
    free_shipping:
      coupon.discount_type === "free_shipping" ||
      coupon.free_shipping ||
      undefined,
  };
}

function recalculateShopOffer(
  offer: AppliedOffer | null,
  currentItems: ShopCartItem[],
  baseAmount: number,
) {
  if (!offer) {
    return null;
  }

  if (!isPromotionApplicableToShopCart(offer, currentItems)) {
    return null;
  }

  if (baseAmount < (offer.min_order_value ?? 0)) {
    return null;
  }

  return {
    ...offer,
    discount_amount: 0,
    free_shipping:
      offer.discount_type === "free_shipping" ||
      offer.free_shipping ||
      undefined,
  };
}

export function getShopCartTotals(state: ShopCartTotalsState) {
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const appliedCoupon = recalculateShopCoupon(
    state.appliedCoupon ?? null,
    state.items,
    subtotal,
  );
  const couponWaterfall = calculatePricingWaterfall({
    materialCost: subtotal,
    machineCost: 0,
    postProcessingCharges: 0,
    quantity: itemCount,
    overheadPercent: 0,
    marginPercent: 0,
    coupon:
      appliedCoupon && !appliedCoupon.free_shipping
        ? {
            discountType: appliedCoupon.discount_type,
            discountValue: appliedCoupon.discount_value,
            maxDiscount: appliedCoupon.max_discount,
          }
        : null,
    deliveryCharge: 0,
  });
  const appliedOffer = recalculateShopOffer(
    state.autoApplyOffer ?? null,
    state.items,
    couponWaterfall.afterCoupon,
  );
  const waterfall = calculatePricingWaterfall({
    materialCost: subtotal,
    machineCost: 0,
    postProcessingCharges: 0,
    quantity: itemCount,
    overheadPercent: 0,
    marginPercent: 0,
    coupon:
      appliedCoupon && !appliedCoupon.free_shipping
        ? {
            discountType: appliedCoupon.discount_type,
            discountValue: appliedCoupon.discount_value,
            maxDiscount: appliedCoupon.max_discount,
          }
        : null,
    offer:
      appliedOffer && !appliedOffer.free_shipping
        ? {
            discountType: appliedOffer.discount_type,
            discountValue: appliedOffer.discount_value,
            maxDiscount: appliedOffer.max_discount,
          }
        : null,
    deliveryCharge: 0,
  });
  const legacyDiscountAmount =
    state.appliedCoupon || state.autoApplyOffer
      ? 0
      : Math.max(0, state.discountAmount ?? 0);
  const resolvedCoupon = appliedCoupon
    ? { ...appliedCoupon, discount_amount: waterfall.couponDiscountAmount }
    : null;
  const resolvedOffer = appliedOffer
    ? { ...appliedOffer, discount_amount: waterfall.offerDiscountAmount }
    : null;
  const discount = Math.min(
    subtotal,
    waterfall.discount + legacyDiscountAmount,
  );
  const total = Math.max(0, subtotal - discount);

  return {
    itemCount,
    subtotal,
    couponDiscountAmount: waterfall.couponDiscountAmount,
    offerDiscountAmount: waterfall.offerDiscountAmount,
    discount,
    total,
    couponCode: resolvedCoupon?.code ?? state.couponCode ?? null,
    offerName: resolvedOffer?.title ?? null,
    appliedCoupon: resolvedCoupon,
    appliedOffer: resolvedOffer,
    freeShipping: Boolean(
      resolvedCoupon?.free_shipping || resolvedOffer?.free_shipping,
    ),
  };
}

export const useShopCartStore = create<ShopCartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      discountAmount: 0,
      appliedCoupon: null,
      autoApplyOffer: null,
      isCartOpen: false,
      isSyncing: false,
      priceChangedItemIds: [],
      addItem: (item) => {
        let mirrored: ShopCartItem | null = null;
        set((state) => {
          const existing = state.items.find((cartItem) =>
            sameShopCartEntry(cartItem, item),
          );
          if (existing) {
            mirrored = {
              ...existing,
              quantity: clampQuantity(
                existing.quantity + item.quantity,
                item.maxStock,
              ),
              maxStock: item.maxStock,
            };
            return {
              items: state.items.map((cartItem) =>
                cartItem.cartItemId === existing.cartItemId
                  ? mirrored!
                  : cartItem,
              ),
            };
          }

          mirrored = {
            ...item,
            customizationText: item.customizationText.trim(),
            quantity: clampQuantity(item.quantity, item.maxStock),
            cartItemId: nanoid(),
            localOnly: true,
          };
          return { items: [...state.items, mirrored] };
        });
        if (mirrored) {
          const itemToMirror = mirrored;
          void loadShopCartSync().then((sync) =>
            sync.mirrorShopAdd(itemToMirror),
          );
        }
      },
      removeItem: (cartItemId) => {
        set((state) => {
          const items = state.items.filter(
            (item) => item.cartItemId !== cartItemId,
          );
          return {
            items,
            ...(items.length === 0
              ? { couponCode: null, appliedCoupon: null, discountAmount: 0 }
              : {}),
          };
        });
        void loadShopCartSync().then((sync) =>
          sync.mirrorShopRemove(cartItemId),
        );
      },
      updateQuantity: (cartItemId, newQty) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: clampQuantity(newQty, item.maxStock) }
              : item,
          ),
        }));
        const updated = useShopCartStore
          .getState()
          .items.find((item) => item.cartItemId === cartItemId);
        if (updated && !updated.localOnly) {
          void loadShopCartSync().then((sync) =>
            sync.mirrorShopQuantity(
              cartItemId,
              updated.quantity,
              updated.price,
            ),
          );
        }
      },
      clearCart: () => {
        set({
          items: [],
          couponCode: null,
          appliedCoupon: null,
          discountAmount: 0,
          priceChangedItemIds: [],
        });
        void loadShopCartSync().then((sync) => sync.mirrorShopClear());
      },
      applyCoupon: (coupon) => {
        if (typeof coupon === "string") {
          set({
            couponCode: coupon.trim().toUpperCase(),
            appliedCoupon: null,
            discountAmount: 0,
          });
          return;
        }

        set({
          couponCode: coupon.code.trim().toUpperCase(),
          appliedCoupon: coupon,
          discountAmount: 0,
        });
      },
      removeCoupon: () =>
        set({ couponCode: null, appliedCoupon: null, discountAmount: 0 }),
      setAutoApplyOffer: (offer) => set({ autoApplyOffer: offer }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
    }),
    {
      name: "flux3d_shop_cart",
      partialize: (state): ShopCartPersistedState => ({
        items: state.items,
        couponCode: state.couponCode,
        discountAmount: 0,
        appliedCoupon: state.appliedCoupon,
      }),
    },
  ),
);

if (typeof window !== "undefined") {
  void loadShopCartSync().then((sync) => sync.initShopCartSync());
}
