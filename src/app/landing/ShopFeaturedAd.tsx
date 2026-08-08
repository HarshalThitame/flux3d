'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Box, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import { formatShopPrice, getShopProductImages } from '@/lib/shop/selection'
import MagneticButton from '@/components/ui/MagneticButton'

const ROTATION_MS = 6000

function productImage(product: ShopPublicProduct) {
  return getShopProductImages(product)[0] ?? null
}

function ShopFallback() {
  return (
    <div className="flex h-full min-h-[380px] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6d28d9]">Shop spotlight</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#fdf6e3] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#7a5d12]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4af37]" />
          Featured
        </span>
      </div>

      <div className="flex flex-1 flex-col items-start justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6d28d9] to-[#a855f7] text-white shadow-[0_16px_40px_rgba(109,40,217,0.35)]">
          <Box className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-black leading-tight text-[#070b1d]">Browse the 3D Shop</h3>
          <p className="mt-2 max-w-[320px] text-sm leading-6 text-[#4B5563]">
            Ready-made products, desk objects, and curated prints — shipped across India.
          </p>
        </div>
        <MagneticButton>
          <Link
            href="/3d-shop"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(109,40,217,0.35)] transition hover:from-[#4c1d95] hover:to-[#6d28d9]"
          >
            Explore Shop
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </MagneticButton>
      </div>
    </div>
  )
}

function Slide({ product, index, count, onNav }: { product: ShopPublicProduct; index: number; count: number; onNav: (index: number) => void }) {
  const image = productImage(product)
  const price = formatShopPrice(product.display_price)
  const onSale = product.has_sale && product.compare_at_price && product.compare_at_price > product.display_price
  const saveAmount = onSale ? Math.round((product.compare_at_price as number) - product.display_price) : null
  const hasRating = product.review_count > 0 && product.avg_rating > 0

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-3"
    >
      <div className="group relative overflow-hidden rounded-2xl border border-[#6d28d9]/10 bg-[#f5f3ff] shadow-[0_18px_50px_rgba(17,24,39,0.10)]">
        <div className="relative aspect-[4/3] overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              priority={false}
              sizes="(min-width: 1280px) 470px, 420px"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#ede9fe] to-[#f5f3ff]">
              <Box className="h-10 w-10 text-[#6d28d9]/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b1d]/25 via-transparent to-transparent opacity-60" />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <span className="rounded-full border border-[#d4af37]/40 bg-[#fdf6e3] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#7a5d12] shadow-sm">
            Featured
          </span>
          {saveAmount !== null && (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-rose-700 shadow-sm">
              Save {formatShopPrice(saveAmount)}
            </span>
          )}
        </div>

        {product.is_low_stock && (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-700 shadow-sm">
            Low stock
          </span>
        )}

        {product.model_url && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-gray-200 bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#4B5563] shadow-sm backdrop-blur">
            3D Preview
          </span>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous product"
              onClick={() => onNav((index - 1 + count) % count)}
              className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/85 text-[#070b1d] opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next product"
              onClick={() => onNav((index + 1) % count)}
              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/85 text-[#070b1d] opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {product.category_name && (
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6d28d9]">{product.category_name}</div>
      )}

      <h3 className="line-clamp-2 text-[clamp(1.15rem,1.9vw,1.45rem)] font-black leading-[1.15] text-[#070b1d]">
        {product.name}
      </h3>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasRating ? (
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" />
            <span className="text-sm font-bold text-[#070b1d]">{product.avg_rating.toFixed(1)}</span>
            <span className="text-xs font-semibold text-[#4B5563]">({product.review_count} reviews)</span>
          </span>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4B5563]">New arrival</span>
        )}
        <span className="inline-flex items-baseline gap-2">
          <span className="text-xl font-black text-[#070b1d]">{price}</span>
          {onSale && product.compare_at_price && (
            <span className="text-sm font-semibold text-[#4B5563] line-through">
              {formatShopPrice(product.compare_at_price)}
            </span>
          )}
        </span>
      </div>

      <p className="line-clamp-2 text-sm leading-6 text-[#4B5563]">
        {product.description || 'Ready-to-ship 3D printed product from the Flux3D shop.'}
      </p>

      <MagneticButton className="mt-1">
        <Link
          href={`/3d-shop/product/${product.slug}`}
          className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(109,40,217,0.35)] transition hover:from-[#4c1d95] hover:to-[#6d28d9]"
        >
          View in Shop
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </MagneticButton>
    </motion.div>
  )
}

export default function ShopFeaturedAd({ products }: { products: ShopPublicProduct[] }) {
  const reduceMotion = useReducedMotion()
  const count = products.length
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (count <= 1 || paused || reduceMotion) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        setActiveIndex((current) => (current + 1) % count)
      }
    }, ROTATION_MS)
    return () => window.clearInterval(id)
  }, [count, paused, reduceMotion])

  if (count === 0) {
    return (
      <div className="premium-machine-panel hero-shop-panel">
        <ShopFallback />
      </div>
    )
  }

  const product = products[activeIndex]

  return (
    <div
      className="premium-machine-panel hero-shop-panel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6d28d9]">Shop spotlight</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#fdf6e3] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#7a5d12]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4af37]" />
          Featured
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <Slide
          key={product.id}
          product={product}
          index={activeIndex}
          count={count}
          onNav={(next) => setActiveIndex(next)}
        />
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-label="Featured products">
          {products.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.name}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-6 bg-[#6d28d9]' : 'w-1.5 bg-[#d1d5db] hover:bg-[#a78bfa]'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4B5563]">
          {product.stock_status === 'low_stock' ? 'Low stock — order soon' : 'Ships in 2–4 days'}
        </span>
      </div>
    </div>
  )
}