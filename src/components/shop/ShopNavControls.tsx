'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { AppUserProfile } from '@/lib/auth/server'
import ShopCartNavButton from '@/components/shop/ShopCartNavButton'
import { useShopCartStore } from '@/stores/shopCartStore'
import { useShopWishlistStore } from '@/stores/shopWishlistStore'

const ShopCartDrawer = dynamic(() => import('@/components/shop/ShopCartDrawer'), { ssr: false })

export default function ShopNavControls({
  mobile = false,
  currentPath,
  currentUser,
  onOpenAction,
}: {
  mobile?: boolean
  currentPath: string
  currentUser: AppUserProfile | null
  onOpenAction?: () => void
}) {
  const setWishlist = useShopWishlistStore((state) => state.setWishlist)
  const isShopCartOpen = useShopCartStore((state) => state.isCartOpen)

  useEffect(() => {
    let active = true

    async function loadWishlist() {
      if (!currentUser || !currentPath.startsWith('/3d-shop')) {
        setWishlist([])
        return
      }

      try {
        const response = await fetch('/api/3d-shop/wishlist')
        const data = await response.json().catch(() => ({})) as { productIds?: string[] }
        if (active && response.ok) setWishlist(data.productIds ?? [])
      } catch {
        if (active) setWishlist([])
      }
    }

    void loadWishlist()
    return () => {
      active = false
    }
  }, [currentPath, currentUser, setWishlist])

  return (
    <>
      <ShopCartNavButton mobile={mobile} onOpenAction={onOpenAction} />
      {isShopCartOpen ? <ShopCartDrawer /> : null}
    </>
  )
}
