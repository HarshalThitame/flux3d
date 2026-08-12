'use client'

import { motion, cubicBezier, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { Star, Box } from 'lucide-react'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import HeroFadeIn from '@/components/ui/WordReveal'
import { Sparkles } from 'lucide-react'

const MOBILE_ITEM_WIDTH = 140

function MobileProductCard({ product }: {
  product: ShopPublicProduct
}) {
  const image = product.image_urls?.[0] ?? product.thumbnail_url ?? null

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={
        useReducedMotion()
          ? { duration: 0.2 }
          : { duration: 0.4, ease: cubicBezier(0.4, 0, 0.2, 1) }
      }
      className="flex flex-col gap-3 min-w-[140px] max-w-[140px] flex-shrink-0"
    >
      <div className="relative rounded-2xl overflow-hidden border border-[#6d28d9]/15 bg-[#0e1117] shadow-[0_8px_24px_rgba(0,0,0,0.4)] group">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            width={MOBILE_ITEM_WIDTH}
            height={MOBILE_ITEM_WIDTH * 2}
            className="transition duration-500 group-hover:scale-105 object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-transparent via-[#6d28d9]/10 to-transparent"
          >
            <Box className="h-8 w-8 text-[#6d28d9]/40" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-2">
          {product.stock_status === 'low_stock' && (
            <span className="rounded-full border border-amber-300 bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-[0.08em] px-2.5 py-1 shadow-sm">
              Low stock
            </span>
          )}
        </div>

        {product.model_url && (
          <span
            className="absolute bottom-2 right-2 rounded-full border border-white/70 bg-black/50 text-xs font-bold uppercase text-white px-2 py-1 backdrop-blur"
          >
            3D Preview
          </span>
        )}

        {product.is_new && (
          <span
            className="absolute top-2 right-2 rounded-full border border-purple-400 bg-purple-500/20 text-[10px] font-black uppercase text-[var(--primary)] px-2.5 py-1 shadow-sm"
          >
            New
          </span>
        )}
      </div>

      <div className="text-center">
        <p className="line-clamp-2 text-[10px] font-medium text-[#6F7192]">
          {product.description || 'Custom 3D-printed product'}
        </p>

        <div className="mt-2 flex items-baseline gap-1">
          {product.avg_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
              <span className="text-[10px] font-bold text-[#070b1d]">{product.avg_rating.toFixed(1)}</span>
              <span className="text-[9px] text-[#6F7192]">({product.review_count})</span>
            </span>
          )}

          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
            {product.stock_status === 'low_stock' ? 'Order soon' : '2–4 days'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function MobileShopFeaturedAd({ products }: { products: ShopPublicProduct[] }) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      className="enterprise-mobile-ad border-t border-[#6d28d9]/20 bg-[#0e1117]/80 backdrop-blur-sm border-b-[1px] border-[#6d28d9]/10"
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
      onFocus={() => {}}
      onBlur={() => {}}
      aria-label="Featured 3D products"
    >
      <div className="max-w-[calc(100vw-4rem)] mx-auto px-3 sm:px-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6d28d9]">Featured</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0.2 }
                  : { duration: 0.4, ease: cubicBezier(0.4, 0, 0.2, 1) }
              }
              className="flex flex-col items-center"
            >
              <MobileProductCard product={product} />
            </motion.div>
          ))}
        </div>

        <HeroFadeIn delay={0.8} className="mx-auto mt-5 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5b21b6]" text="Production timelines shared before confirmation" />
      </div>
    </div>
  )
}