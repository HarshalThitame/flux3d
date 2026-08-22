'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Box, MousePointer2, Sparkles } from 'lucide-react'
import ArcImageCarouselBoundary from '@/components/shop/ArcImageCarouselBoundary'
import ProductModelModal from '@/components/shop/ProductModelModal'
import { getShopProductImages } from '@/lib/shop/selection'
import type { ShopHomeData, ShopPublicProduct } from '@/lib/shop/public-types'

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1]
const MAX_ARC_ITEMS = 12

export default function HeroSection({ shopData }: { shopData: ShopHomeData }) {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const [modelProduct, setModelProduct] = useState<ShopPublicProduct | null>(null)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const products = useMemo(() => {
    const seen = new Set<string>()
    return [...shopData.featured_products, ...shopData.new_arrivals]
      .filter((product) => {
        if (seen.has(product.id)) return false
        seen.add(product.id)
        return true
      })
      .slice(0, MAX_ARC_ITEMS)
  }, [shopData])

  const product = products[Math.min(activeIndex, Math.max(products.length - 1, 0))]

  const handleSelect = useCallback(
    (index: number) => {
      const selected = products[index]
      if (!selected) return
      if (selected.model_url) {
        setModelProduct(selected)
        return
      }
      router.push(`/3d-shop/product/${selected.slug}`)
    },
    [products, router]
  )

  const handleActiveChange = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  const items = useMemo(
    () =>
      products.map((item) => ({
        id: item.id,
        src: item.landscape_image_url || getShopProductImages(item)[0] || null,
        title: item.name,
        subheadline:
          item.category_name ||
          (item.description ? item.description.split('.')[0].slice(0, 90) : undefined),
        alt: item.name,
      })),
    [products]
  )

  return (
    <section className="lux-hero" aria-label="Featured 3D products">
      <div className="absolute inset-x-0 top-0 z-40 flex items-center px-6 pt-6 sm:px-8 sm:pt-7">
        <Link href="/" aria-label="Flux3D home" className="group">
          <div className="font-[var(--lux-font-display)] text-xl font-semibold tracking-tight text-[var(--lux-text-primary)] sm:text-2xl">
            Flux3D <span className="italic text-[var(--lux-gold)]">Store</span>
          </div>
        </Link>
      </div>

      <div className="relative h-full w-full">
        {products.length > 0 && (
          <ArcImageCarouselBoundary
            items={items}
            onSelectItemAction={handleSelect}
            onActiveIndexChangeAction={handleActiveChange}
            ariaLabel="Drag or scroll to browse featured 3D printed products"
          />
        )}

        <div className="lux-hero-grain" aria-hidden />
      </div>

      {products.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.15 }}
            className="pointer-events-none absolute inset-x-0 top-20 z-20 flex flex-col items-center gap-2 px-6 text-center sm:top-24"
          >
            <p className="lux-eyebrow">
              <Sparkles className="h-3 w-3" />
              Exclusive 3D Collection
            </p>
            <h1 className="font-[var(--lux-font-display)] text-3xl font-semibold tracking-tight text-[var(--lux-text-primary)] sm:text-4xl lg:text-5xl">
              Flux3D <span className="italic text-[var(--lux-gold)]">Signature</span> Pieces
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 1 }}
            className="pointer-events-none absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--lux-line,#e5ddcb)] bg-white/70 px-4 py-2 text-center text-xs font-medium tracking-wide text-[var(--lux-text-secondary,#4a4438)] shadow-sm backdrop-blur-sm sm:bottom-24"
          >
            <MousePointer2 className="h-3.5 w-3.5 text-[var(--lux-gold)]" />
            Drag to explore — click a piece to preview in 3D
          </motion.div>

          <p className="sr-only" aria-live="polite">
            {product ? `Showing ${product.name}` : ''}
          </p>
        </>
      )}

      {products.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--lux-bg-base)] px-6">
          <Box className="mb-4 h-16 w-16 text-[var(--lux-taupe)]" />
          <h2 className="lux-heading-2 mb-2 text-center">Restocking Soon</h2>
          <p className="lux-body mb-6 text-center text-[var(--lux-text-muted)]">
            Explore our full catalog for ready-to-ship 3D objects.
          </p>
          <Link href="/3d-shop" className="lux-btn-primary">
            Visit Store <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {mounted &&
        modelProduct?.model_url &&
        createPortal(
          <ProductModelModal
            open
            modelUrl={modelProduct.model_url}
            productName={modelProduct.name}
            onClose={() => setModelProduct(null)}
          />,
          document.body
        )}
    </section>
  )
}
