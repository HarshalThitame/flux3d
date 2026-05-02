'use client'

import { CART_STORAGE_KEY, type CartItem, type CartSummary } from '@/lib/cart/types'
import { calculateDeliveryCharge } from '@/lib/orders'

export function getCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(CART_STORAGE_KEY)
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

export function saveCartToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

export function addToCart(item: CartItem): CartItem[] {
  const currentItems = getCartFromStorage()
  const newItems = [...currentItems, item]
  saveCartToStorage(newItems)
  return newItems
}

export function removeFromCart(addedAt: string): CartItem[] {
  const currentItems = getCartFromStorage()
  const newItems = currentItems.filter((item) => item.addedAt !== addedAt)
  saveCartToStorage(newItems)
  return newItems
}

export function clearCart() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(CART_STORAGE_KEY)
}

export function getCartSummary(): CartSummary {
  const items = getCartFromStorage()
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

export function updateCartItem(addedAt: string, updates: Partial<CartItem>): CartItem[] {
  const currentItems = getCartFromStorage()
  const newItems = currentItems.map((item) => {
    if (item.addedAt !== addedAt) return item
    return {
      ...item,
      ...updates,
    }
  })
  saveCartToStorage(newItems)
  return newItems
}

export function isItemInCart(quoteId: string): boolean {
  const items = getCartFromStorage()
  return items.some((item) => item.quoteId === quoteId)
}
