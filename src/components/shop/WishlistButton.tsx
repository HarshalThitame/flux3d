'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useShopWishlistStore } from '@/stores/shopWishlistStore'
import { addToast } from '@/lib/toast/store'
import { trackMetaEvent } from '@/lib/meta/event-utils'

export default function WishlistButton({
  productId,
  className = '',
  label = false,
}: {
  productId: string
  className?: string
  label?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname() ?? '/3d-shop'
  const wishlisted = useShopWishlistStore((state) => state.wishlistedIds.has(productId))
  const addToWishlist = useShopWishlistStore((state) => state.addToWishlist)
  const removeFromWishlist = useShopWishlistStore((state) => state.removeFromWishlist)
  const [pending, setPending] = useState(false)

  async function toggleWishlist() {
    if (pending) return

    const nextWishlisted = !wishlisted
    if (nextWishlisted) {
      addToWishlist(productId)
      trackMetaEvent('AddToWishlist', {
        content_ids: [productId],
        content_type: 'product',
      })
    } else {
      removeFromWishlist(productId)
    }
    addToast({ type: 'success', title: nextWishlisted ? 'Added to wishlist' : 'Removed from wishlist', description: nextWishlisted ? '♥ Saved to your wishlist' : undefined })
    setPending(true)

    try {
      const response = await fetch(nextWishlisted ? '/api/3d-shop/wishlist' : `/api/3d-shop/wishlist/${productId}`, {
        method: nextWishlisted ? 'POST' : 'DELETE',
        headers: nextWishlisted ? { 'Content-Type': 'application/json' } : undefined,
        body: nextWishlisted ? JSON.stringify({ productId }) : undefined,
      })
      const data = await response.json().catch(() => ({})) as { error?: string }

      if (response.status === 401) {
        if (nextWishlisted) removeFromWishlist(productId)
        else addToWishlist(productId)
        router.push(`/login?next=${encodeURIComponent(pathname)}`)
        return
      }

      if (!response.ok) throw new Error(data.error || 'Wishlist update failed.')
    } catch (error) {
      if (nextWishlisted) removeFromWishlist(productId)
      else addToWishlist(productId)
      addToast({ type: 'error', title: 'Wishlist error', description: error instanceof Error ? error.message : 'Wishlist update failed.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <motion.button
      type="button"
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={wishlisted}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void toggleWishlist()
      }}
      whileTap={{ scale: 0.85 }}
      animate={wishlisted ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-2 rounded-full border border-[var(--shop-border-light)] bg-white px-3 text-sm font-bold shadow-[var(--shop-shadow-sm)] transition hover:scale-105 disabled:opacity-60 ${wishlisted ? 'text-rose-600' : 'text-[var(--shop-text-secondary)]'} ${className}`}
      disabled={pending}
    >
      <Heart className={`h-4 w-4 ${wishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
      {label ? <span>{wishlisted ? 'Saved' : 'Wishlist'}</span> : null}
    </motion.button>
  )
}
