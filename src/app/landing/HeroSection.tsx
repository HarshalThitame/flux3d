'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Box, ChevronLeft, ChevronRight, ShieldCheck, ShoppingBag, Sparkles, Star, Truck } from 'lucide-react'
import { addToast } from '@/lib/toast/store'
import { formatShopPrice, formatVariantLabel, getShopProductBadge, getShopProductImages } from '@/lib/shop/selection'
import { useShopCartStore } from '@/stores/shopCartStore'
import type { ShopHomeData } from '@/lib/shop/public-types'
import { trackMetaEvent } from '@/lib/meta/event-utils'
import QuickAddModal from '@/components/shop/QuickAddModal'
import ProductModelModal from '@/components/shop/ProductModelModal'
import CategoryFilterDropdown from './CategoryFilterDropdown'

const ROTATION_MS = 5500

export default function HeroSection({ shopData }: { shopData: ShopHomeData }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [category, setCategory] = useState('all')
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const addItem = useShopCartStore((state) => state.addItem)

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

  useEffect(() => {
    if (visibleProducts.length <= 1 || rotationPaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        setActiveIndex((current) => (current + 1) % visibleProducts.length)
      }
    }, ROTATION_MS)
    return () => window.clearInterval(id)
  }, [visibleProducts.length, rotationPaused])

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
      description: `${product.name} — ${formatShopPrice(directSku.price)}`,
    })
    window.setTimeout(() => setAdded(false), 1500)
  }

  return (
    <section className="shop-luxury relative overflow-hidden bg-[var(--shop-bg-base,#FDFCF8)] px-4 pb-16 pt-24 sm:px-6 md:px-10 lg:px-12 lg:pb-24 lg:pt-28">
      {/* Top Boutique Bar */}
      <div className="mx-auto mb-8 flex max-w-[1280px] items-center justify-between gap-4 border-b border-[var(--shop-border-light,#E7E5E0)] pb-6">
        <Link href="/" aria-label="Flux3D home" className="group">
          <div className="font-[var(--shop-font-heading)] text-2xl font-semibold tracking-tight text-[var(--shop-text-primary,#1C1917)]">
            Flux3D <span className="text-[var(--shop-gold,#C9A962)] font-serif italic">Boutique</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <CategoryFilterDropdown
            categories={shopData.categories}
            value={category}
            onOpenChange={setFilterOpen}
            onChange={selectCategory}
          />
        </div>
      </div>

      {/* Main Studio Showcase Grid */}
      <div
        className="mx-auto grid max-w-[1280px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14"
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
      >
        {/* Left Column: Product Information & Interactive Controls */}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint,#FAF6EB)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">
            <Sparkles className="h-3.5 w-3.5" />
            Curated 3D Printed Collection
          </div>

          {product ? (
            <>
              <div className="mt-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--shop-text-muted,#78716C)]">
                <span>{product.category_name || 'Boutique Collection'}</span>
                {product.review_count > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 text-[var(--shop-text-primary,#1C1917)]">
                      <Star className="h-3.5 w-3.5 fill-[var(--shop-gold,#C9A962)] text-[var(--shop-gold,#C9A962)]" />
                      <span>{product.avg_rating.toFixed(1)}</span>
                      <span className="text-[var(--shop-text-muted,#78716C)]">({product.review_count})</span>
                    </div>
                  </>
                )}
              </div>

              <h1 className="font-[var(--shop-font-heading)] mt-3 text-[clamp(2.4rem,5.5vw,4.2rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--shop-text-primary,#1C1917)]">
                {product.name}
              </h1>

              <p className="mt-4 line-clamp-3 max-w-xl text-base leading-7 text-[var(--shop-text-secondary,#44403C)] sm:text-lg">
                {product.description || 'Premium 3D printed piece crafted with clean layer finishes, precision tolerances, and ready-to-ship presentation.'}
              </p>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-[var(--shop-font-heading)] text-3xl font-semibold text-[var(--shop-text-primary,#1C1917)] sm:text-4xl">
                  {formatShopPrice(product.display_price)}
                </span>
                {product.compare_at_price && onSale && (
                  <span className="text-lg text-[var(--shop-text-subtle,#A8A29E)] line-through">
                    {formatShopPrice(product.compare_at_price)}
                  </span>
                )}
                {saveAmount !== null && (
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600">
                    Save {formatShopPrice(saveAmount)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={product.variant_options.length === 0 && !canDirectAdd}
                  onClick={handleAdd}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary,#1C1917)] px-7 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-gold,#C9A962)] hover:shadow-[var(--shop-shadow-md)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {added ? 'Added to Cart' : 'Add to Cart'}
                </button>

                {hasModel && (
                  <button
                    type="button"
                    onClick={() => setModelOpen(true)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint,#FAF6EB)] px-6 text-sm font-semibold text-[var(--shop-gold,#C9A962)] transition hover:border-[var(--shop-gold)] hover:bg-[var(--shop-gold-soft)]"
                  >
                    <Box className="h-4 w-4" />
                    Live 3D Preview
                  </button>
                )}

                <Link
                  href={`/3d-shop/product/${product.slug}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-medium,#D7D3CB)] bg-white px-6 text-sm font-semibold text-[var(--shop-text-primary,#1C1917)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  View Details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Product Thumbnail Selector Strip */}
              {visibleProducts.length > 1 && (
                <div className="mt-10 border-t border-[var(--shop-border-light,#E7E5E0)] pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-text-muted,#78716C)]">
                      Boutique Items ({index + 1} of {visibleProducts.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToSlide(index - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--shop-border-light,#E7E5E0)] bg-white text-[var(--shop-text-primary,#1C1917)] shadow-sm transition hover:border-[var(--shop-gold,#C9A962)] hover:text-[var(--shop-gold,#C9A962)]"
                        aria-label="Previous product"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => goToSlide(index + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--shop-border-light,#E7E5E0)] bg-white text-[var(--shop-text-primary,#1C1917)] shadow-sm transition hover:border-[var(--shop-gold,#C9A962)] hover:text-[var(--shop-gold,#C9A962)]"
                        aria-label="Next product"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {visibleProducts.map((p, i) => {
                      const thumb = getShopProductImages(p)[0]
                      const isActive = i === index
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => goToSlide(i)}
                          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                            isActive
                              ? 'border-[var(--shop-gold,#C9A962)] shadow-[var(--shop-shadow-gold)] scale-105'
                              : 'border-[var(--shop-border-light,#E7E5E0)] opacity-70 hover:opacity-100'
                          }`}
                        >
                          {thumb ? (
                            <Image src={thumb} alt={p.name} fill sizes="64px" className="object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center bg-[var(--shop-bg-muted,#F2F0EA)]">
                              <Box className="h-4 w-4 text-[var(--shop-text-subtle,#A8A29E)]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12">
              <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary,#1C1917)]">
                Collection restock in progress
              </h2>
              <p className="mt-2 text-sm text-[var(--shop-text-muted,#78716C)]">
                Select another category or explore all ready-to-ship products in the boutique.
              </p>
              <Link href="/3d-shop" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--shop-text-primary,#1C1917)] px-6 text-sm font-semibold text-white">
                Visit Full Store <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Studio Showcase Canvas */}
        <div className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[var(--shop-radius-xl,32px)] border border-[var(--shop-border-gold)] bg-white p-4 shadow-[var(--shop-shadow-lg)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(201,169,98,0.08)_0%,transparent_70%)] pointer-events-none" />

            {/* Badges Overlay */}
            <div className="absolute left-6 top-6 z-10 flex flex-wrap gap-2">
              {badge && (
                <span className="rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint,#FAF6EB)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)] shadow-sm">
                  {badge}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--shop-border-light,#E7E5E0)] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--shop-text-muted,#78716C)] shadow-sm">
                <ShieldCheck className="h-3 w-3 text-[var(--shop-gold,#C9A962)]" />
                QA Checked
              </span>
            </div>

            {hasModel && (
              <div className="absolute right-6 top-6 z-10">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint,#FAF6EB)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold,#C9A962)] shadow-sm">
                  <Box className="h-3 w-3" />
                  Interactive 3D
                </span>
              </div>
            )}

            {/* Main Crisp Product Image */}
            <div className="relative h-full w-full overflow-hidden rounded-[var(--shop-radius-lg,24px)] bg-[var(--shop-bg-soft,#FAF9F5)]">
              {image ? (
                <Image
                  key={product?.id}
                  src={image}
                  alt={product?.name || 'Flux3D product'}
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover transition duration-700 hover:scale-105"
                />
              ) : (
                <div className="grid h-full place-items-center text-center p-8">
                  <div>
                    <Box className="mx-auto h-12 w-12 text-[var(--shop-gold,#C9A962)] mb-3" />
                    <p className="font-[var(--shop-font-heading)] text-lg font-semibold text-[var(--shop-text-primary,#1C1917)]">Flux3D Boutique</p>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Specs Bar */}
            <div className="absolute bottom-6 inset-x-6 z-10 flex items-center justify-between gap-3 rounded-2xl border border-[var(--shop-border-light,#E7E5E0)] bg-white/95 p-3.5 shadow-md backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--shop-text-primary,#1C1917)]">
                <Truck className="h-4 w-4 text-[var(--shop-gold,#C9A962)]" />
                <span>Dispatch: 2–4 Days</span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--shop-text-muted,#78716C)]">
                ±0.2mm Precision
              </div>
            </div>
          </div>
        </div>
      </div>

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