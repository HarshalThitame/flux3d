'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  addToCart,
  calculateCartSummary,
  clearCart,
  getCartFromStorage,
  getCartStorageKey,
  removeFromCart,
  saveCartToStorage,
  updateCartItem,
} from '@/lib/cart/utils'
import type { AppliedCoupon, CartItem, CartSummary } from '@/lib/cart/types'

const CART_SKIP_RESTORE_FLAG = 'flux3d-cart-skip-restore'

type CartContextType = {
  items: CartItem[]
  summary: CartSummary
  addItem: (item: CartItem) => void
  removeItem: (addedAt: string) => void
  updateItem: (addedAt: string, updates: Partial<CartItem>) => void
  clearItems: () => void
  resetCartState: () => void
  isInCart: (quoteId: string) => boolean
  isLoading: boolean
  appliedCoupon: AppliedCoupon | null
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void
  autoApplyOffer: AppliedCoupon | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageKey, setStorageKey] = useState(() => getCartStorageKey())
  const [userCoupon, setUserCoupon] = useState<AppliedCoupon | null>(null)
  const [autoApplyOffer, setAutoApplyOffer] = useState<AppliedCoupon | null>(null)

  const itemsRef = useRef(items)
  itemsRef.current = items

  const appliedCoupon = userCoupon ?? autoApplyOffer

  function recalculateDiscount(coupon: AppliedCoupon | null, currentItems: CartItem[]): AppliedCoupon | null {
    if (!coupon) return null
    const subtotal = currentItems.reduce((sum, item) => sum + item.price, 0)
    if (subtotal < (coupon.min_order_value ?? 0)) return null

    let discountAmount = 0
    if (coupon.discount_type === 'percentage') {
      discountAmount = (subtotal * coupon.discount_value) / 100
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = Math.min(coupon.discount_value, subtotal)
    }

    return { ...coupon, discount_amount: discountAmount }
  }

  function setAppliedCoupon(coupon: AppliedCoupon | null) {
    const recalculated = recalculateDiscount(coupon, itemsRef.current)
    setUserCoupon(recalculated)
  }

  useEffect(() => {
    if (isLoading) return
    let cancelled = false
    fetch('/api/offers/auto-apply')
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data.valid || !data.offer) {
          if (!cancelled) setAutoApplyOffer(null)
          return
        }
        const recalculated = recalculateDiscount(data.offer, itemsRef.current)
        if (!cancelled) setAutoApplyOffer(recalculated)
      })
      .catch(() => {
        if (!cancelled) setAutoApplyOffer(null)
      })
    return () => { cancelled = true }
  }, [isLoading])

  useEffect(() => {
    if (isLoading) return
    if (userCoupon) {
      const recalculated = recalculateDiscount(userCoupon, itemsRef.current)
      setUserCoupon(recalculated)
    } else if (autoApplyOffer) {
      const recalculated = recalculateDiscount(autoApplyOffer, itemsRef.current)
      setAutoApplyOffer(recalculated)
    }
  }, [items, isLoading])

  const summary = calculateCartSummary(items, appliedCoupon)

  useEffect(() => {
    let active = true
    const supabase = getSupabaseBrowserClient()

    async function syncCartForUser(userId: string | null) {
      const shouldSkipAnonymousRestore =
        userId === null &&
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem(CART_SKIP_RESTORE_FLAG) === '1'

      if (shouldSkipAnonymousRestore) {
        window.sessionStorage.removeItem(CART_SKIP_RESTORE_FLAG)

        if (!active) {
          return
        }

        setStorageKey(getCartStorageKey(null))
        setItems([])
        setIsLoading(false)
        return
      }

      const nextStorageKey = getCartStorageKey(userId)
      const nextItems = getCartFromStorage(nextStorageKey)

      if (!active) {
        return
      }

      console.info('[Cart] Loaded cart for', userId ?? 'anonymous')
      setStorageKey(nextStorageKey)
      setItems(nextItems)
      setIsLoading(false)
    }

    async function bootstrap() {
      try {
        const { data } = await supabase.auth.getSession()
        await syncCartForUser(data.session?.user.id ?? null)
      } catch (error) {
        console.error('[Cart] Failed to resolve auth session. Falling back to anonymous cart.', error)
        await syncCartForUser(null)
      }
    }

    void bootstrap()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!active) {
          return
        }

        console.info('[Cart] Auth state changed:', event)

        if (session?.user.id) {
          void syncCartForUser(session.user.id)
          return
        }

        setStorageKey(getCartStorageKey(null))
        setItems([])
        setIsLoading(false)
      }
    )

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (isLoading) {
      return
    }

    saveCartToStorage(items, storageKey)
  }, [items, storageKey, isLoading])

  const addItem = (item: CartItem) => {
    const newItems = addToCart(item, storageKey)
    setItems(newItems)
  }

  const removeItem = (addedAt: string) => {
    const newItems = removeFromCart(addedAt, storageKey)
    setItems(newItems)
  }

  const updateItem = (addedAt: string, updates: Partial<CartItem>) => {
    const newItems = updateCartItem(addedAt, updates, storageKey)
    setItems(newItems)
  }

  const clearItems = () => {
    clearCart(storageKey)
    setItems([])
    setUserCoupon(null)
  }

  const resetCartState = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CART_SKIP_RESTORE_FLAG, '1')
    }

    setStorageKey(getCartStorageKey(null))
    setItems([])
    setIsLoading(false)
  }

  const isInCart = (quoteId: string) => {
    return items.some((item) => item.quoteId === quoteId)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        addItem,
        removeItem,
        updateItem,
        clearItems,
        resetCartState,
        isInCart,
        isLoading,
        appliedCoupon,
        setAppliedCoupon,
        autoApplyOffer,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
