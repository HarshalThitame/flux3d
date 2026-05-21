'use client'

import { create } from 'zustand'

type ShopWishlistState = {
  wishlistedIds: Set<string>
  setWishlist: (productIds: string[]) => void
  addToWishlist: (productId: string) => void
  removeFromWishlist: (productId: string) => void
  isWishlisted: (productId: string) => boolean
}

export const useShopWishlistStore = create<ShopWishlistState>()((set, get) => ({
  wishlistedIds: new Set<string>(),
  setWishlist: (productIds) => set({ wishlistedIds: new Set(productIds) }),
  addToWishlist: (productId) =>
    set((state) => {
      const next = new Set(state.wishlistedIds)
      next.add(productId)
      return { wishlistedIds: next }
    }),
  removeFromWishlist: (productId) =>
    set((state) => {
      const next = new Set(state.wishlistedIds)
      next.delete(productId)
      return { wishlistedIds: next }
    }),
  isWishlisted: (productId) => get().wishlistedIds.has(productId),
}))
