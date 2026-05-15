'use client'

import {
  CART_STORAGE_KEY,
  getAnonymousCartKey,
  type AppliedOffer,
  type AppliedCoupon,
  type CartDiscountTier,
  type CartItem,
  type CartSummary,
} from '@/lib/cart/types'
import {
  calculatePricingWaterfall,
  getHighestCartDiscountTier,
} from '@/lib/quote/pricing-waterfall'

export function getCartStorageKey(userId: string | null = null) {
  return userId ? `${CART_STORAGE_KEY}_${userId}` : getAnonymousCartKey()
}

export function getCartFromStorage(storageKey = getAnonymousCartKey()): CartItem[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCartToStorage(items: CartItem[], storageKey = getAnonymousCartKey()) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(items))
}

export function addToCart(item: CartItem, storageKey = getAnonymousCartKey()): CartItem[] {
  const currentItems = getCartFromStorage(storageKey)
  const newItems = [...currentItems, item]
  saveCartToStorage(newItems, storageKey)
  return newItems
}

export function removeFromCart(addedAt: string, storageKey = getAnonymousCartKey()): CartItem[] {
  const currentItems = getCartFromStorage(storageKey)
  const newItems = currentItems.filter((item) => item.addedAt !== addedAt)
  saveCartToStorage(newItems, storageKey)
  return newItems
}

export function clearCart(storageKey = getAnonymousCartKey()) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(storageKey)
}

type PromotionLike = {
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  discount_value: number
  max_discount: number | null
  min_order_value: number
  discount_amount: number
  applicable_categories?: string[] | null
  applicable_materials?: string[] | null
  applicable_products?: string[] | null
  free_shipping?: boolean
}

type CartSummaryOptions = {
  cartDiscountEnabled?: boolean
  cartDiscountTiers?: CartDiscountTier[]
  appliedCoupon?: AppliedCoupon | null
  appliedOffer?: AppliedOffer | null
  deliveryChargeThreshold?: number
  defaultDeliveryCharge?: number
}

function isPromotionApplicableToCart(
  promotion: PromotionLike,
  currentItems: CartItem[]
) {
  const categories = promotion.applicable_categories
  const materials = promotion.applicable_materials
  const products = promotion.applicable_products

  if (!categories?.length && !materials?.length && !products?.length) {
    return true
  }

  if (materials?.length) {
    const itemMaterials = currentItems.map((item) => item.material).filter(Boolean)
    if (!materials.some((material) => itemMaterials.includes(material))) {
      return false
    }
  }

  if (products?.length) {
    const itemIds = currentItems.map((item) => item.id).filter(Boolean)
    if (!products.some((product) => itemIds.includes(product))) {
      return false
    }
  }

  return true
}

function recalculateCoupon(coupon: AppliedCoupon | null, currentItems: CartItem[], baseAmount: number): AppliedCoupon | null {
  if (!coupon) {
    return null
  }

  if (!isPromotionApplicableToCart(coupon, currentItems)) {
    return null
  }

  if (baseAmount < (coupon.min_order_value ?? 0)) {
    return null
  }

  return {
    ...coupon,
    discount_amount: 0,
    free_shipping: coupon.discount_type === 'free_shipping' || coupon.free_shipping || undefined,
  }
}

function recalculateOffer(offer: AppliedOffer | null, currentItems: CartItem[], baseAmount: number): AppliedOffer | null {
  if (!offer) {
    return null
  }

  if (!isPromotionApplicableToCart(offer, currentItems)) {
    return null
  }

  if (baseAmount < (offer.min_order_value ?? 0)) {
    return null
  }

  return {
    ...offer,
    discount_amount: 0,
    free_shipping: offer.discount_type === 'free_shipping' || offer.free_shipping || undefined,
  }
}

export function calculateCartSummary(items: CartItem[], options: CartSummaryOptions = {}): CartSummary {
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.totalPrice ?? item.price ?? 0), 0)
  const cartTier = getHighestCartDiscountTier(
    itemsTotal,
    options.cartDiscountTiers ?? [],
    options.cartDiscountEnabled ?? true
  )
  const cartDiscountPercent = cartTier?.discountPercent ?? 0
  const cartWaterfall = calculatePricingWaterfall({
    materialCost: itemsTotal,
    machineCost: 0,
    postProcessingCharges: 0,
    quantity: itemCount,
    overheadPercent: 0,
    marginPercent: 0,
    cartDiscountPercent,
    deliveryCharge: 0,
    deliveryThreshold: options.deliveryChargeThreshold,
    defaultDeliveryCharge: options.defaultDeliveryCharge,
  })
  const appliedCoupon = recalculateCoupon(options.appliedCoupon ?? null, items, cartWaterfall.afterCart)
  const couponWaterfall = calculatePricingWaterfall({
    materialCost: itemsTotal,
    machineCost: 0,
    postProcessingCharges: 0,
    quantity: itemCount,
    overheadPercent: 0,
    marginPercent: 0,
    cartDiscountPercent,
    coupon: appliedCoupon && !appliedCoupon.free_shipping
      ? {
          discountType: appliedCoupon.discount_type,
          discountValue: appliedCoupon.discount_value,
          maxDiscount: appliedCoupon.max_discount,
        }
      : null,
    deliveryCharge: 0,
    deliveryThreshold: options.deliveryChargeThreshold,
    defaultDeliveryCharge: options.defaultDeliveryCharge,
  })
  const appliedOffer = recalculateOffer(options.appliedOffer ?? null, items, couponWaterfall.afterCoupon)
  const deliveryOverride = appliedCoupon?.free_shipping || appliedOffer?.free_shipping ? 0 : null
  const waterfall = calculatePricingWaterfall({
    materialCost: itemsTotal,
    machineCost: 0,
    postProcessingCharges: 0,
    quantity: itemCount,
    overheadPercent: 0,
    marginPercent: 0,
    cartDiscountPercent,
    coupon: appliedCoupon && !appliedCoupon.free_shipping
      ? {
          discountType: appliedCoupon.discount_type,
          discountValue: appliedCoupon.discount_value,
          maxDiscount: appliedCoupon.max_discount,
        }
      : null,
    offer: appliedOffer && !appliedOffer.free_shipping
      ? {
          discountType: appliedOffer.discount_type,
          discountValue: appliedOffer.discount_value,
          maxDiscount: appliedOffer.max_discount,
        }
      : null,
    deliveryCharge: deliveryOverride,
    deliveryThreshold: options.deliveryChargeThreshold,
    defaultDeliveryCharge: options.defaultDeliveryCharge,
  })
  const resolvedCoupon = appliedCoupon
    ? { ...appliedCoupon, discount_amount: waterfall.couponDiscountAmount }
    : null
  const resolvedOffer = appliedOffer
    ? { ...appliedOffer, discount_amount: waterfall.offerDiscountAmount }
    : null

  return {
    items,
    itemCount,
    itemsTotal,
    subtotal: itemsTotal,
    cartDiscountAmount: waterfall.cartDiscountAmount,
    cartDiscountPercent: waterfall.cartDiscountPercent,
    couponDiscountAmount: waterfall.couponDiscountAmount,
    couponCode: resolvedCoupon?.code ?? null,
    couponId: resolvedCoupon?.id ?? null,
    couponDiscountType: resolvedCoupon?.discount_type ?? null,
    offerDiscountAmount: waterfall.offerDiscountAmount,
    offerId: resolvedOffer?.id ?? null,
    offerName: resolvedOffer?.title ?? null,
    offerCode: resolvedOffer?.code ?? null,
    offerDiscountType: resolvedOffer?.discount_type ?? null,
    deliveryCharge: waterfall.deliveryCharge,
    discount: waterfall.discount,
    finalPrice: waterfall.finalPrice,
    grandTotal: waterfall.grandTotal,
    total: waterfall.grandTotal,
    appliedCoupon: resolvedCoupon,
    appliedOffer: resolvedOffer,
  }
}

export function getCartSummary(storageKey = getAnonymousCartKey()): CartSummary {
  return calculateCartSummary(getCartFromStorage(storageKey))
}

export function updateCartItem(
  addedAt: string,
  updates: Partial<CartItem>,
  storageKey = getAnonymousCartKey()
): CartItem[] {
  const currentItems = getCartFromStorage(storageKey)
  const newItems = currentItems.map((item) => {
    if (item.addedAt !== addedAt) return item
    return {
      ...item,
      ...updates,
    }
  })
  saveCartToStorage(newItems, storageKey)
  return newItems
}

export function isItemInCart(quoteId: string, storageKey = getAnonymousCartKey()): boolean {
  const items = getCartFromStorage(storageKey)
  return items.some((item) => item.quoteId === quoteId)
}
