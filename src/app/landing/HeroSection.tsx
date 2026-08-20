'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Star,
  ShieldCheck,
} from 'lucide-react'
import { addToast } from '@/lib/toast/store'
import {
  formatShopPrice,
  formatVariantLabel,
  getShopProductBadge,
  getShopProductImages,
} from '@/lib/shop/selection'
import { useShopCartStore } from '@/stores/shopCartStore'
import type { ShopHomeData } from '@/lib/shop/public-types'
import { trackMetaEvent } from '@/lib/meta/event-utils'
import QuickAddModal from '@/components/shop/QuickAddModal'
import ProductModelModal from '@/components/shop/ProductModelModal'
import CategoryFilterDropdown from './CategoryFilterDropdown'

const ROTATION_MS = 6000

export default function HeroSection({ shopData }: { shopData: ShopHomeData }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [category, setCategory] = useState('all')
  const [progress, setProgress] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const addItem = useShopCartStore((state) => state.addItem)
  const trackRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const allProducts = useMemo(() => {
    const seen = new Set<string>()
    return [...shopData.featured_products, ...shopData.new_arrivals].filter((product) => {
      if (seen.has(product.id)) return false
      seen.add(product.id)
      return true
    })
  }, [shopData])

  const visibleProducts = useMemo(
    () => (category === 'all' ? allProducts : allProducts.filter((product) => product.category_slug === category)),
    [category, allProducts]
  )

  const index = visibleProducts.length > 0 ? Math.min(activeIndex, visibleProducts.length - 1) : 0
  const rotationPaused = hoverPaused || quickAddOpen || modelOpen || filterOpen

  // Auto-rotate + progress bar
  useEffect(() => {
    if (visibleProducts.length <= 1 || rotationPaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    lastTimeRef.current = performance.now()
    progressRef.current = 0

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now
      progressRef.current += delta

      const pct = Math.min((progressRef.current / ROTATION_MS) * 100, 100)
      setProgress(pct)

      if (progressRef.current >= ROTATION_MS) {
        progressRef.current = 0
        if (document.visibilityState !== 'hidden') {
          setActiveIndex((current) => (current + 1) % visibleProducts.length)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [visibleProducts.length, rotationPaused, activeIndex])

  // Reset progress on slide change
  useEffect(() => {
    progressRef.current = 0
    setProgress(0)
  }, [activeIndex])

  function goToSlide(nextIndex: number) {
    setActiveIndex(((nextIndex % visibleProducts.length) + visibleProducts.length) % visibleProducts.length)
  }

  function selectCategory(slug: string) {
    setCategory(slug)
    setActiveIndex(0)
    setFilterOpen(false)
  }

  const product = visibleProducts[index]
  const images = product ? getShopProductImages(product) : []
  const image = images[0] ?? null
  const badge = product ? getShopProductBadge(product) : null
  const onSale = product?.has_sale && product.compare_at_price !== null && product.compare_at_price > product.display_price
  const saveAmount = onSale && product ? Math.round((product.compare_at_price as number) - product.display_price) : null
  const directSku = product && product.variant_options.length === 0 ? product.skus.find((sku) => sku.is_available !== false) ?? null : null
  const canDirectAdd = Boolean(directSku && (directSku.stock_quantity > 0 || directSku.pre_order_eta))
  const hasModel = Boolean(product?.model_url)

  function handleAdd() {
    if (!product) return
    if (!directSku) {
      setQuickAddOpen(true)
      return
    }
    if (!canDirectAdd) return
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      categoryId: product.category_id,
      categoryName: product.category_name,
      categorySlug: product.category_slug,
      thumbnail: directSku.variant_image_url || product.thumbnail_url || images[0] || '',
      skuId: directSku.id,
      skuCode: directSku.sku_code,
      variantCombination: directSku.variant_combination,
      variantLabel: formatVariantLabel(directSku.variant_combination),
      customizationText: '',
      price: directSku.price,
      compareAtPrice: directSku.compare_at_price,
      quantity: 1,
      maxStock: directSku.pre_order_eta ? 10 : directSku.stock_quantity,
    })
    setAdded(true)
    trackMetaEvent('AddToCart', {
      content_ids: [directSku.sku_code],
      content_type: 'product',
      contents: [{ id: directSku.sku_code, quantity: 1, item_price: directSku.price }],
      value: directSku.price,
      currency: 'INR',
    })
    addToast({
      type: 'success',
      title: 'Added to cart',
      description: `${product.name} \u2014 ${formatShopPrice(directSku.price)}`,
    })
    window.setTimeout(() => setAdded(false), 1500)
  }

  // Touch/swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToSlide(index + 1)
      else goToSlide(index - 1)
    }
    setTouchStart(null)
  }, [touchStart, index])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToSlide(index - 1)
      if (e.key === 'ArrowRight') goToSlide(index + 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, visibleProducts.length])

  return (
    <section
      className="lux-hero"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar: Brand + Category filter */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
        <Link href="/" aria-label="Flux3D home" className="group">
          <div className="font-[var(--lux-font-display)] text-xl font-semibold tracking-tight text-[var(--lux-text-primary)] sm:text-2xl">
            Flux3D <span className="italic text-[var(--lux-gold)]">Boutique</span>
          </div>
        </Link>

        <CategoryFilterDropdown
          categories={shopData.categories}
          value={category}
          onOpenChange={setFilterOpen}
          onChange={selectCategory}
        />
      </div>

      {/* Carousel track */}
      <div className="relative h-full w-full overflow-hidden">
        <div
          ref={trackRef}
          className="lux-carousel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {visibleProducts.map((p, i) => {
            const pImages = getShopProductImages(p)
            const pImage = pImages[0] ?? null
            const pBadge = getShopProductBadge(p)

            return (
              <div key={p.id} className="lux-hero-slide">
                {/* Full-bleed product image */}
                {pImage ? (
                  <Image
                    src={pImage}
                    alt={p.name}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="lux-hero-image"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--lux-bg-muted)]">
                    <Box className="h-16 w-16 text-[var(--lux-taupe)]" />
                  </div>
                )}

                {/* Gradient shade for text readability */}
                <div className="lux-hero-shade" />

                {/* Floating badges - top right */}
                <div className="absolute right-6 top-24 z-20 flex flex-col items-end gap-2 sm:right-8 sm:top-28">
                  {pBadge && (
                    <span className="lux-badge lux-badge-gold shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      {pBadge}
                    </span>
                  )}
                  <span className="lux-badge lux-badge-outline shadow-sm">
                    <ShieldCheck className="h-3 w-3 text-[var(--lux-gold)]" />
                    QA Passed
                  </span>
                </div>

                {/* Content overlay */}
                <div className="lux-hero-content">
                  <div className="lux-hero-panel lux-glass">
                    {/* Eyebrow */}
                    <div className="lux-eyebrow mb-4">
                      <Sparkles className="h-3.5 w-3.5" />
                      Exclusive 3D Collection
                    </div>

                    {/* Category + rating */}
                    <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lux-text-muted)]">
                      <span>{p.category_name || 'Curated Store'}</span>
                      {p.review_count > 0 && (
                        <>
                          <span className="text-[var(--lux-taupe)]">\u2022</span>
                          <div className="flex items-center gap-1 text-[var(--lux-text-primary)]">
                            <Star className="h-3.5 w-3.5 fill-[var(--lux-gold)] text-[var(--lux-gold)]" />
                            <span className="font-bold">{p.avg_rating.toFixed(1)}</span>
                            <span className="text-[var(--lux-text-muted)]">({p.review_count} reviews)</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Product name */}
                    <h1 className="lux-heading-1 mb-3">
                      {p.name}
                    </h1>

                    {/* Description */}
                    <p className="lux-body mb-5 line-clamp-2 max-w-md">
                      {p.description || 'Handcrafted 3D printed luxury object built with high precision tolerances, studio finishing, and ready-to-ship packaging.'}
                    </p>

                    {/* Price */}
                    <div className="mb-6 flex items-baseline gap-4">
                      <span className="lux-price">{formatShopPrice(p.display_price)}</span>
                      {p.compare_at_price && onSale && (
                        <span className="lux-price-was">{formatShopPrice(p.compare_at_price)}</span>
                      )}
                      {saveAmount !== null && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                          Save {formatShopPrice(saveAmount)}
                        </span>
                      )}
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={p.variant_options.length === 0 && !canDirectAdd}
                        onClick={handleAdd}
                        className="lux-btn-primary"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        {added ? 'Added to Cart' : 'Add to Cart'}
                      </button>

                      {hasModel && (
                        <button
                          type="button"
                          onClick={() => setModelOpen(true)}
                          className="lux-btn-secondary"
                        >
                          <Box className="h-4 w-4" />
                          View in 3D
                        </button>
                      )}

                      <Link
                        href={`/3d-shop/product/${p.slug}`}
                        className="lux-btn-ghost"
                      >
                        Explore Details
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="lux-carousel-progress" style={{ width: `${progress}%` }} />

      {/* Thumbnail strip */}
      {visibleProducts.length > 1 && (
        <div className="lux-thumbnail-strip hidden sm:flex">
          {visibleProducts.map((p, i) => {
            const thumb = getShopProductImages(p)[0]
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => goToSlide(i)}
                className={`lux-thumbnail ${i === index ? 'lux-thumbnail-active' : ''}`}
                aria-label={`Go to ${p.name}`}
              >
                {thumb ? (
                  <Image src={thumb} alt={p.name} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--lux-bg-muted)]">
                    <Box className="h-4 w-4 text-[var(--lux-taupe)]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Controls: dots + arrows */}
      {visibleProducts.length > 1 && (
        <div className="lux-carousel-controls">
          <div className="lux-carousel-dots hidden md:flex">
            {visibleProducts.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToSlide(i)}
                className={`lux-carousel-dot ${i === index ? 'lux-carousel-dot-active' : ''}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToSlide(index - 1)}
            className="lux-carousel-arrow"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goToSlide(index + 1)}
            className="lux-carousel-arrow"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Empty state */}
      {visibleProducts.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--lux-bg-base)] px-6">
          <Box className="mb-4 h-16 w-16 text-[var(--lux-taupe)]" />
          <h2 className="lux-heading-2 mb-2 text-center">Category Restocking Soon</h2>
          <p className="lux-body mb-6 text-center text-[var(--lux-text-muted)]">
            Explore our full boutique catalog for ready-to-ship 3D objects.
          </p>
          <Link href="/3d-shop" className="lux-btn-primary">
            Visit Store <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Modals */}
      {mounted && product && createPortal(
        <QuickAddModal product={product} open={quickAddOpen} onOpenChangeAction={setQuickAddOpen} />,
        document.body
      )}
      {mounted && product && product.model_url && createPortal(
        <ProductModelModal
          open={modelOpen}
          modelUrl={product.model_url}
          productName={product.name}
          onClose={() => setModelOpen(false)}
        />,
        document.body
      )}
    </section>
  )
}
