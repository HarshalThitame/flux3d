'use client'

import {
  CART_STORAGE_KEY,
  getAnonymousCartKey,
  type AppliedCoupon,
  type CartItem,
  type CartSummary,
} from '@/lib/cart/types'
import { calculateDeliveryCharge } from '@/lib/orders'

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

export function calculateCartSummary(items: CartItem[], appliedCoupon: AppliedCoupon | null = null): CartSummary {
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  let deliveryCharge = calculateDeliveryCharge(subtotal)
  let discount = 0

  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'free_shipping') {
      deliveryCharge = 0
    } else {
      discount = appliedCoupon.discount_amount
    }
  }

  return {
    items,
    itemCount,
    subtotal,
    deliveryCharge,
    discount,
    total: Math.max(0, subtotal + deliveryCharge - discount),
    appliedCoupon,
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
