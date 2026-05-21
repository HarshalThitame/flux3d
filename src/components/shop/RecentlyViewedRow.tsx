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
    <section className="px-4 py-10 md:px-8 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--brand-primary)]" />
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Recently Viewed</h2>
        </div>
        <div className="grid auto-cols-[68%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[38%] lg:auto-cols-[23%]">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/3d-shop/product/${product.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="relative aspect-square bg-[var(--bg-muted)]">
                {product.thumbnail_url ? (
                  <Image src={product.thumbnail_url} alt={product.name} fill sizes="(min-width: 1024px) 25vw, 70vw" className="object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center text-4xl">🧩</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 min-h-[44px] text-base font-bold leading-snug text-[var(--text-primary)]">{product.name}</h3>
                <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">From {formatShopPrice(product.base_price)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
