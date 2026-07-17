'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
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
import type { BusinessSettings } from '@/lib/admin/business-settings'
import type { AppliedCoupon, AppliedOffer, CartDiscountTier, CartItem, CartSummary } from '@/lib/cart/types'

const CART_SKIP_RESTORE_FLAG = 'flux3d-cart-skip-restore'
const AUTH_CART_BOOTSTRAP_PATHS = [
  '/3d-shop',
  '/cart',
  '/instant-quote',
  '/my-orders',
  '/orders',
  '/profile',
  '/quote',
  '/saved-quotes',
]

function runWhenIdle(callback: () => void, timeout = 2500) {
  if (typeof window === 'undefined') return () => {}

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout })
    return () => idleWindow.cancelIdleCallback?.(idleId)
  }

  const timeoutId = window.setTimeout(callback, Math.min(timeout, 1200))
  return () => window.clearTimeout(timeoutId)
}

function runOnFirstIntent(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  let done = false
  const events = ['pointerdown', 'keydown', 'touchstart'] as const

  const run = () => {
    if (done) return
    done = true
    events.forEach((event) => window.removeEventListener(event, run))
    callback()
  }

  events.forEach((event) => window.addEventListener(event, run, { once: true, passive: true }))

  return () => {
    done = true
    events.forEach((event) => window.removeEventListener(event, run))
  }
}

function shouldBootstrapAuthCartImmediately() {
  if (typeof window === 'undefined') return false
  const pathname = window.location.pathname || '/'
  return AUTH_CART_BOOTSTRAP_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

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

type CartProviderSettings = Pick<
  BusinessSettings,
  'cartDiscountEnabled' | 'cartDiscountTiers' | 'deliveryChargeThreshold' | 'defaultDeliveryCharge'
>

export function CartProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode
  initialSettings?: CartProviderSettings
}) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageKey, setStorageKey] = useState(() => getCartStorageKey())
  const [userCoupon, setUserCoupon] = useState<AppliedCoupon | null>(null)
  const [autoApplyOffer, setAutoApplyOffer] = useState<AppliedOffer | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [cartDiscountEnabled, setCartDiscountEnabled] = useState(initialSettings?.cartDiscountEnabled ?? true)
  const [cartDiscountTiers, setCartDiscountTiers] = useState<CartDiscountTier[]>(initialSettings?.cartDiscountTiers ?? [])
  const [deliveryChargeThreshold, setDeliveryChargeThreshold] = useState<number | undefined>(initialSettings?.deliveryChargeThreshold)
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState<number | undefined>(initialSettings?.defaultDeliveryCharge)

  const appliedCoupon = userCoupon

  const setAppliedCoupon = useCallback((coupon: AppliedCoupon | null) => {
    setUserCoupon(coupon)
  }, [])

  useEffect(() => {
    if (isLoading || initialSettings) return
    let cancelled = false

    const cancelIdle = runWhenIdle(() => {
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
    })

    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [initialSettings, isLoading])

  useEffect(() => {
    if (isLoading) return
    let cancelled = false

    const cancelIdle = runWhenIdle(() => {
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
    })

    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [isLoading])

  const summary = useMemo(() => calculateCartSummary(items, {
    appliedCoupon: userCoupon,
    appliedOffer: autoApplyOffer,
    cartDiscountEnabled,
    cartDiscountTiers,
    deliveryChargeThreshold,
    defaultDeliveryCharge,
  }), [
    autoApplyOffer,
    cartDiscountEnabled,
    cartDiscountTiers,
    defaultDeliveryCharge,
    deliveryChargeThreshold,
    items,
    userCoupon,
  ])

  useEffect(() => {
    let active = true
    let authListener: { subscription: { unsubscribe: () => void } } | null = null

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
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
        const supabase = getSupabaseBrowserClient()
        const { data } = await supabase.auth.getSession()
        await syncCartForUser(data.session?.user.id ?? null)

        const { data: nextAuthListener } = supabase.auth.onAuthStateChange(
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
        authListener = nextAuthListener
      } catch {
        await syncCartForUser(null)
      }
    }

    void syncCartForUser(null)
    const scheduleBootstrap = shouldBootstrapAuthCartImmediately() ? runWhenIdle : runOnFirstIntent
    const cancelBootstrap = scheduleBootstrap(() => {
      if (active) void bootstrap()
    })

    return () => {
      active = false
      cancelBootstrap()
      authListener?.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (isLoading) {
      return
    }

    saveCartToStorage(items, storageKey)
  }, [items, storageKey, isLoading])

  const addItem = useCallback((item: CartItem) => {
    const newItems = addToCart(item, storageKey)
    setItems(newItems)
    void import('@/lib/tracking/featureTracker')
      .then(({ trackFeatureUsage }) => trackFeatureUsage(currentUserId, 'item_added_to_cart', {
        quoteId: item.quoteId,
        material: item.material,
        quantity: item.quantity,
        total: item.totalPrice ?? item.price,
      }))
      .catch(() => {})
  }, [currentUserId, storageKey])

  const removeItem = useCallback((addedAt: string) => {
    const newItems = removeFromCart(addedAt, storageKey)
    setItems(newItems)
  }, [storageKey])

  const updateItem = useCallback((addedAt: string, updates: Partial<CartItem>) => {
    const newItems = updateCartItem(addedAt, updates, storageKey)
    setItems(newItems)
  }, [storageKey])

  const clearItems = useCallback(() => {
    clearCart(storageKey)
    setItems([])
    setUserCoupon(null)
  }, [storageKey])

  const resetCartState = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CART_SKIP_RESTORE_FLAG, '1')
    }

    setStorageKey(getCartStorageKey(null))
    setCurrentUserId(null)
    setItems([])
    setIsLoading(false)
  }, [])

  const isInCart = useCallback((quoteId: string) => {
    return items.some((item) => item.quoteId === quoteId)
  }, [items])

  const contextValue = useMemo<CartContextType>(() => ({
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
  }), [
    addItem,
    appliedCoupon,
    autoApplyOffer,
    clearItems,
    isInCart,
    isLoading,
    items,
    removeItem,
    resetCartState,
    setAppliedCoupon,
    summary,
    updateItem,
  ])

  return (
    <CartContext.Provider value={contextValue}>
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
