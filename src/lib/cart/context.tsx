'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  addToCart,
  clearCart,
  getCartFromStorage,
  getCartSummary,
  removeFromCart,
  updateCartItem,
} from '@/lib/cart/utils'
import type { CartItem, CartSummary } from '@/lib/cart/types'

type CartContextType = {
  items: CartItem[]
  summary: CartSummary
  addItem: (item: CartItem) => void
  removeItem: (addedAt: string) => void
  updateItem: (addedAt: string, updates: Partial<CartItem>) => void
  clearItems: () => void
  isInCart: (quoteId: string) => boolean
  isLoading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<CartSummary>({
    items: [],
    itemCount: 0,
    subtotal: 0,
    deliveryCharge: 0,
    total: 0,
  })

  useEffect(() => {
    const cartItems = getCartFromStorage()
    setItems(cartItems)
    setSummary(getCartSummary())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    setSummary(getCartSummary())
  }, [items])

  const addItem = (item: CartItem) => {
    const newItems = addToCart(item)
    setItems(newItems)
  }

  const removeItem = (addedAt: string) => {
    const newItems = removeFromCart(addedAt)
    setItems(newItems)
  }

  const updateItem = (addedAt: string, updates: Partial<CartItem>) => {
    const newItems = updateCartItem(addedAt, updates)
    setItems(newItems)
  }

  const clearItems = () => {
    clearCart()
    setItems([])
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
