'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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
import type { CartItem, CartSummary } from '@/lib/cart/types'

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
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageKey, setStorageKey] = useState(() => getCartStorageKey())

  const summary = calculateCartSummary(items)

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

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
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
    })

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
