'use client'

import {
  CART_STORAGE_KEY,
  getAnonymousCartKey,
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

export function calculateCartSummary(items: CartItem[]): CartSummary {
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const deliveryCharge = calculateDeliveryCharge(subtotal)

  return {
    items,
    itemCount,
    subtotal,
    deliveryCharge,
    total: subtotal + deliveryCharge,
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
