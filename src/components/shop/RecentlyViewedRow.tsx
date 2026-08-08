'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { formatShopPrice } from '@/lib/shop/selection'
import { getRecentlyViewed, type RecentlyViewedShopProduct } from '@/lib/shop/recentlyViewed'

export default function RecentlyViewedRow() {
  const [products, setProducts] = useState<RecentlyViewedShopProduct[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProducts(getRecentlyViewed().slice(0, 6))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (products.length < 2) return null

  return (
    <section className="px-4 py-12 sm:px-6 md:px-10 lg:px-12 lg:py-16">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">History</div>
            <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">Recently Viewed</h2>
          </div>
        </div>
        <div className="grid auto-cols-[68%] grid-flow-col gap-4 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scroll-padding-left-4 sm:auto-cols-[38%] lg:auto-cols-[23%]">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/3d-shop/product/${product.slug}`}
              className="group h-full snap-start overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] shadow-[var(--shop-shadow-sm)] transition hover:-translate-y-1 hover:border-[var(--shop-border-gold)] hover:shadow-[var(--shop-shadow-md)]"
            >
              <div className="relative aspect-square bg-[var(--shop-bg-muted)]">
                {product.thumbnail_url ? (
                  <Image src={product.thumbnail_url} alt={product.name} fill sizes="(min-width: 1024px) 25vw, 70vw" className="object-cover transition duration-700 ease-out group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center text-4xl text-[var(--shop-text-subtle)]">🧩</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-[var(--shop-font-heading)] line-clamp-2 min-h-[44px] text-base font-semibold leading-snug text-[var(--shop-text-primary)]">{product.name}</h3>
                <div className="mt-2 text-sm font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(product.base_price)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
