'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { getShopCartTotals, useShopCartStore } from '@/stores/shopCartStore'

export default function ShopCartNavButton({
  mobile = false,
  onOpenAction,
}: {
  mobile?: boolean
  onOpenAction?: () => void
}) {
  const itemCount = useShopCartStore((state) => getShopCartTotals(state).itemCount)
  const label = '3D Shop Cart'

  return (
    <Link
      href="/3d-shop/cart"
      prefetch={false}
      onClick={() => {
        onOpenAction?.()
      }}
      aria-label={label}
      title={mobile ? undefined : label}
      className={
        mobile
          ? 'navbar-mobile-action-light relative flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white py-3.5 text-base font-medium text-[var(--shop-text-secondary)]'
          : 'shop-cart-nav-button group relative inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)] shadow-[0_10px_28px_rgba(28,25,23,0.06)] backdrop-blur transition hover:border-[var(--shop-border-gold)] hover:bg-white hover:text-[var(--shop-text-primary)]'
      }
    >
      <ShoppingBag className="h-4 w-4" />
      <span className={mobile ? undefined : 'sr-only'}>{label}</span>
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--shop-gold)] px-1 text-[10px] font-bold text-white shadow-[var(--shop-shadow-gold)]">
          {itemCount}
        </span>
      )}
    </Link>
  )
}
