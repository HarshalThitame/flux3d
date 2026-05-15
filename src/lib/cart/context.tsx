'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import type { AppliedCoupon, AppliedOffer, CartDiscountTier, CartItem, CartSummary } from '@/lib/cart/types'

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
  autoApplyOffer: AppliedOffer | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageKey, setStorageKey] = useState(() => getCartStorageKey())
  const [userCoupon, setUserCoupon] = useState<AppliedCoupon | null>(null)
  const [autoApplyOffer, setAutoApplyOffer] = useState<AppliedOffer | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [cartDiscountEnabled, setCartDiscountEnabled] = useState(true)
  const [cartDiscountTiers, setCartDiscountTiers] = useState<CartDiscountTier[]>([])
  const [deliveryChargeThreshold, setDeliveryChargeThreshold] = useState<number | undefined>(undefined)
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState<number | undefined>(undefined)

  const appliedCoupon = userCoupon

  function setAppliedCoupon(coupon: AppliedCoupon | null) {
    setUserCoupon(coupon)
  }

  useEffect(() => {
    if (isLoading) return
    let cancelled = false
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const nextEnabled = data?.settings?.cartDiscountEnabled
        const nextTiers = data?.settings?.cartDiscountTiers
        const nextDeliveryThreshold = Number(data?.settings?.deliveryChargeThreshold)
        const nextDeliveryCharge = Number(data?.settings?.defaultDeliveryCharge)
        if (typeof nextEnabled === 'boolean') {
          setCartDiscountEnabled(nextEnabled)
        }
        if (Array.isArray(nextTiers)) {
          setCartDiscountTiers(
            nextTiers
              .map((tier: { minCartValue?: number; discountPercent?: number }) => ({
                minCartValue: Number(tier.minCartValue ?? 0),
                discountPercent: Number(tier.discountPercent ?? 0),
              }))
              .filter((tier: CartDiscountTier) => Number.isFinite(tier.minCartValue) && Number.isFinite(tier.discountPercent))
          )
        }
        if (Number.isFinite(nextDeliveryThreshold)) setDeliveryChargeThreshold(nextDeliveryThreshold)
        if (Number.isFinite(nextDeliveryCharge)) setDefaultDeliveryCharge(nextDeliveryCharge)
      })
      .catch(() => {
        // Fall back to defaults if public settings cannot be loaded.
      })

    fetch('/api/offers/auto-apply')
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data.valid || !data.offer) {
          if (!cancelled) setAutoApplyOffer(null)
          return
        }
        if (!cancelled) setAutoApplyOffer(data.offer)
      })
      .catch(() => {
        if (!cancelled) setAutoApplyOffer(null)
      })
    return () => { cancelled = true }
  }, [isLoading])

  const summary = calculateCartSummary(items, {
    appliedCoupon: userCoupon,
    appliedOffer: autoApplyOffer,
    cartDiscountEnabled,
    cartDiscountTiers,
    deliveryChargeThreshold,
    defaultDeliveryCharge,
  })

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
        setCurrentUserId(null)
        setItems([])
        setIsLoading(false)
        return
      }

      const nextStorageKey = getCartStorageKey(userId)
      const nextItems = getCartFromStorage(nextStorageKey)

      if (!active) {
        return
      }

      setStorageKey(nextStorageKey)
      setCurrentUserId(userId)
      setItems(nextItems)
      setIsLoading(false)
    }

    async function bootstrap() {
      try {
        const { data } = await supabase.auth.getSession()
        await syncCartForUser(data.session?.user.id ?? null)
      } catch {
        await syncCartForUser(null)
      }
    }

    void bootstrap()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!active) {
          return
        }

        if (session?.user.id) {
          void syncCartForUser(session.user.id)
          return
        }

        setStorageKey(getCartStorageKey(null))
        setCurrentUserId(null)
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
    void trackFeatureUsage(currentUserId, 'item_added_to_cart', {
      quoteId: item.quoteId,
      material: item.material,
      quantity: item.quantity,
      total: item.totalPrice ?? item.price,
    }).catch(() => {})
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
    setCurrentUserId(null)
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
