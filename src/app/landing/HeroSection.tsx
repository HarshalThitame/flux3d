'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
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

const ROTATION_MS = 6000
const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1]

const panelVariants: Variants = {
  enter: { opacity: 1 },
  center: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
  exit: {
    opacity: 1,
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
}

const itemVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: 28,
    x: dir * 20,
    filter: 'blur(4px)',
  }),
  center: {
    opacity: 1,
    y: 0,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: EASE_OUT_EXPO },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: -18,
    x: dir * -12,
    filter: 'blur(3px)',
    transition: { duration: 0.32, ease: 'easeIn' },
  }),
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function HeroSection({ shopData }: { shopData: ShopHomeData }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const reduceMotion = useReducedMotion()
  const addItem = useShopCartStore((state) => state.addItem)
  const progressRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const lineFillRef = useRef<HTMLSpanElement | null>(null)

  // Progress is written straight to the DOM (no per-frame setState) so the
  // carousel never floods React with urgent renders — otherwise transition
  // updates elsewhere on the page get starved and never commit.
  const paintProgress = useCallback(() => {
    const pct = `${Math.min((progressRef.current / ROTATION_MS) * 100, 100)}%`
    if (progressBarRef.current) progressBarRef.current.style.width = pct
    if (lineFillRef.current) lineFillRef.current.style.width = pct
  }, [])

  const resetProgress = useCallback(() => {
    progressRef.current = 0
    if (progressBarRef.current) progressBarRef.current.style.width = '0%'
    if (lineFillRef.current) lineFillRef.current.style.width = '0%'
  }, [])

  const allProducts = useMemo(() => {
    const seen = new Set<string>()
    return [...shopData.featured_products, ...shopData.new_arrivals].filter((product) => {
      if (seen.has(product.id)) return false
      seen.add(product.id)
      return true
    })
  }, [shopData])

  const visibleProducts = allProducts

  const index = visibleProducts.length > 0 ? Math.min(activeIndex, visibleProducts.length - 1) : 0
  const rotationPaused = hoverPaused || quickAddOpen || modelOpen

  // Auto-rotate + progress
  useEffect(() => {
    if (visibleProducts.length <= 1 || rotationPaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    lastTimeRef.current = performance.now()
    progressRef.current = 0

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now
      progressRef.current += delta

      paintProgress()

      if (progressRef.current >= ROTATION_MS) {
        progressRef.current = 0
        if (document.visibilityState !== 'hidden') {
          setDirection(1)
          setActiveIndex((current) => (current + 1) % visibleProducts.length)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [visibleProducts.length, rotationPaused, activeIndex, paintProgress])

  function goToSlide(rawNextIndex: number) {
    const total = visibleProducts.length
    if (total === 0) return
    const nextIndex = ((rawNextIndex % total) + total) % total
    if (nextIndex === index) return
    setDirection(rawNextIndex > activeIndex ? 1 : -1)
    resetProgress()
    setActiveIndex(nextIndex)
  }

  const product = visibleProducts[index]
  const images = product ? getShopProductImages(product) : []
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
      goToSlide(index + (diff > 0 ? 1 : -1))
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
      data-dir={direction === 1 ? 'next' : 'prev'}
      data-reduced={reduceMotion ? 'true' : undefined}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar: Brand only — no category dropdown */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-center px-6 pt-6 sm:px-8 sm:pt-7">
        <Link href="/" aria-label="Flux3D home" className="group">
          <div className="font-[var(--lux-font-display)] text-xl font-semibold tracking-tight text-[var(--lux-text-primary)] sm:text-2xl">
            Flux3D <span className="italic text-[var(--lux-gold)]">Store</span>
          </div>
        </Link>
      </div>

      {/* Stacked slides — crossfade + Ken Burns */}
      <div className="relative h-full w-full overflow-hidden">
        {visibleProducts.map((p, i) => {
          const pImages = getShopProductImages(p)
          const pImage = pImages[0] ?? null
          const pBadge = getShopProductBadge(p)
          const isActive = i === index

          return (
            <div key={p.id} className={`lux-hero-slide ${isActive ? 'lux-hero-slide-active' : ''}`} aria-hidden={!isActive}>
              {/* Full-bleed product image */}
              {pImage ? (
                <Image
                  src={pImage}
                  alt={isActive ? p.name : ''}
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
            </div>
          )
        })}

        {/* Film grain overlay */}
        <div className="lux-hero-grain" aria-hidden />

        {/* Animated content layer */}
        <div className="lux-hero-content">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {product && (
              <motion.div
                key={product.id}
                custom={direction}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="lux-hero-panel lux-glass"
              >
                <motion.div variants={itemVariants} custom={direction} className="lux-eyebrow mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  Exclusive 3D Collection
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  custom={direction}
                  className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lux-text-muted)]"
                >
                  <span>{product.category_name || 'Curated Store'}</span>
                  {product.review_count > 0 && (
                    <>
                      <span className="text-[var(--lux-taupe)]">•</span>
                      <div className="flex items-center gap-1 text-[var(--lux-text-primary)]">
                        <Star className="h-3.5 w-3.5 fill-[var(--lux-gold)] text-[var(--lux-gold)]" />
                        <span className="font-bold">{product.avg_rating.toFixed(1)}</span>
                        <span className="text-[var(--lux-text-muted)]">({product.review_count} reviews)</span>
                      </div>
                    </>
                  )}
                </motion.div>

                <motion.h1 variants={itemVariants} custom={direction} className="lux-heading-1 mb-3 line-clamp-2 sm:line-clamp-3">
                  {product.name}
                </motion.h1>

                <motion.p variants={itemVariants} custom={direction} className="lux-body mb-5 line-clamp-2 max-w-md">
                  {product.description || 'Handcrafted 3D printed luxury object built with high precision tolerances, studio finishing, and ready-to-ship packaging.'}
                </motion.p>

                <motion.div variants={itemVariants} custom={direction} className="mb-6 flex items-baseline gap-4">
                  <span className="lux-price">{formatShopPrice(product.display_price)}</span>
                  {product.compare_at_price && onSale && (
                    <span className="lux-price-was">{formatShopPrice(product.compare_at_price)}</span>
                  )}
                  {saveAmount !== null && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                      Save {formatShopPrice(saveAmount)}
                    </span>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} custom={direction} className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={product.variant_options.length === 0 && !canDirectAdd}
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
                    href={`/3d-shop/product/${product.slug}`}
                    className="lux-btn-ghost"
                  >
                    Explore Details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile progress bar */}
      <div
        ref={progressBarRef}
        className="lux-carousel-progress md:hidden"
        style={{ width: '0%' }}
      />

      {/* Thumbnail strip — desktop only */}
      {visibleProducts.length > 1 && (
        <div className="lux-thumbnail-strip">
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
                  <Image src={thumb} alt="" fill sizes="48px" className="object-cover" />
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

      {/* Editorial controls: numbered indicator + progress lines + arrows */}
      {visibleProducts.length > 1 && (
        <div className="lux-carousel-controls">
          <div className="lux-carousel-index">
            <div className="lux-carousel-count" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={index}
                  className="lux-carousel-count-current"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                >
                  {pad(index + 1)}
                </motion.span>
              </AnimatePresence>
              <span className="lux-carousel-count-sep">—</span>
              <span className="lux-carousel-count-total">{pad(visibleProducts.length)}</span>
            </div>

            <div className="lux-carousel-lines">
              {visibleProducts.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goToSlide(i)}
                  className={`lux-carousel-line ${i === index ? 'lux-carousel-line-active' : ''}`}
                  aria-label={`Go to ${p.name}`}
                >
                  <span
                    ref={i === index ? lineFillRef : undefined}
                    className="lux-carousel-line-fill"
                    style={{ width: i < index ? '100%' : '0%' }}
                  />
                </button>
              ))}
            </div>
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
          <h2 className="lux-heading-2 mb-2 text-center">Restocking Soon</h2>
          <p className="lux-body mb-6 text-center text-[var(--lux-text-muted)]">
            Explore our full catalog for ready-to-ship 3D objects.
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
