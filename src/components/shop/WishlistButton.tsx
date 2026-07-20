'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useShopWishlistStore } from '@/stores/shopWishlistStore'

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
  const [toast, setToast] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function toggleWishlist() {
    if (pending) return

    const nextWishlisted = !wishlisted
    if (nextWishlisted) addToWishlist(productId)
    else removeFromWishlist(productId)
    setToast(nextWishlisted ? 'Added to wishlist ♥' : 'Removed from wishlist')
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
      setToast(error instanceof Error ? error.message : 'Wishlist update failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wishlisted}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void toggleWishlist()
        }}
        className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 text-sm font-bold shadow-[var(--shadow-sm)] transition hover:scale-105 disabled:opacity-60 ${wishlisted ? 'text-rose-600' : 'text-[var(--text-secondary)]'} ${className}`}
        disabled={pending}
      >
        <Heart className={`h-4 w-4 ${wishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
        {label ? <span>{wishlisted ? 'Saved' : 'Wishlist'}</span> : null}
      </button>
      {toast && (
        <div className="fixed bottom-5 right-5 z-[130] rounded-2xl border border-[var(--border-light)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-xl">
          {toast}
        </div>
      )}
    </>
  )
}
