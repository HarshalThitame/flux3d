'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Box, ChevronLeft, ChevronRight, ShoppingBag, Star } from 'lucide-react'
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

  return (
    <section className="premium-hero premium-hero-carousel relative overflow-hidden">
      <div className="premium-hero-surface" aria-hidden="true" />
      <div className="premium-hero-grid" aria-hidden="true" />
      <div className="premium-hero-beams" aria-hidden="true" />
      <div className="premium-corner-frame" aria-hidden="true" />

      <div className="hero-carousel-top">
        <Link href="/" aria-label="Flux3D home">
          <h1 className="hero-carousel-brand">
            Flux3D <em>Boutique</em>
          </h1>
        </Link>
        <CategoryFilterDropdown
          categories={shopData.categories}
          value={category}
          onOpenChange={setFilterOpen}
          onChange={selectCategory}
        />
      </div>

      <div
        className="hero-carousel-viewport"
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onFocusCapture={() => setHoverPaused(true)}
        onBlurCapture={() => setHoverPaused(false)}
      >
        <div className="hero-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {visibleProducts.length === 0 && (
            <div className="hero-carousel-slide">
              <div className="hero-carousel-empty">
                <div className="hero-carousel-eyebrow">Collection</div>
                <div className="hero-carousel-title">New pieces landing soon.</div>
                <p className="hero-carousel-copy">
                  This category is being restocked. Explore the full Flux3D shop for ready-to-ship prints.
                </p>
                <Link href="/3d-shop" className="premium-primary-cta hero-cta-link-pill">
                  Shop the Collection <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {visibleProducts.map((item, slideIndex) => {
            const images = getShopProductImages(item)
            const image = images[0] ?? null
            const badge = getShopProductBadge(item)
            const onSale =
              item.has_sale && item.compare_at_price !== null && item.compare_at_price > item.display_price
            const saveAmount = onSale ? Math.round((item.compare_at_price as number) - item.display_price) : null
            const directSku =
              item.variant_options.length === 0 ? item.skus.find((sku) => sku.is_available !== false) ?? null : null
            const canDirectAdd = Boolean(directSku && (directSku.stock_quantity > 0 || directSku.pre_order_eta))
            const hasModel = Boolean(item.model_url)

            function handleAdd() {
              if (!directSku) {
                setQuickAddOpen(true)
                return
              }
              if (!canDirectAdd) return
              addItem({
                productId: item.id,
                productSlug: item.slug,
                productName: item.name,
                categoryId: item.category_id,
                categoryName: item.category_name,
                categorySlug: item.category_slug,
                thumbnail: directSku.variant_image_url || item.thumbnail_url || images[0] || '',
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
                description: `${item.name} — ${formatShopPrice(directSku.price)}`,
              })
              window.setTimeout(() => setAdded(false), 1500)
            }

            return (
              <div className="hero-carousel-slide" key={item.id}>
                <div className="relative h-full w-full">
                  {image && (
                    <Image
                      src={image}
                      alt={item.name}
                      fill
                      priority={slideIndex === 0}
                      sizes="100vw"
                      className="object-cover object-center"
                    />
                  )}
                  <div className="hero-carousel-shade" aria-hidden="true" />
                </div>

                <div className="hero-carousel-content">
                  <div className="hero-carousel-panel">
                    <div className="hero-carousel-eyebrow">{item.category_name || 'Featured'}</div>
                    <h2 className="hero-carousel-title">{item.name}</h2>

                    {item.review_count > 0 && (
                      <div className="hero-carousel-rating">
                        <Star className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" />
                        <span>{item.avg_rating.toFixed(1)}</span>
                        <span className="hero-carousel-rating-count">({item.review_count} reviews)</span>
                      </div>
                    )}

                    <div className="hero-carousel-price">
                      <span className="hero-carousel-price-now">{formatShopPrice(item.display_price)}</span>
                      {item.compare_at_price && onSale && (
                        <span className="hero-carousel-price-was">{formatShopPrice(item.compare_at_price)}</span>
                      )}
                    </div>

                    <div className="hero-carousel-actions">
                      <button
                        type="button"
                        disabled={item.variant_options.length === 0 && !canDirectAdd}
                        onClick={handleAdd}
                        className="hero-cta-add"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        {added ? 'Added' : 'Add to Cart'}
                      </button>
                      {hasModel && (
                        <button
                          type="button"
                          onClick={() => setModelOpen(true)}
                          aria-label="View 3D preview"
                          className="hero-cta-3d"
                        >
                          <Box className="h-4 w-4" />
                          3D
                        </button>
                      )}
                      <Link href="/3d-shop" prefetch={false} className="hero-cta-link group">
                        Shop the Collection
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </div>

                {badge && <span className="hero-carousel-badge">{badge}</span>}
                {saveAmount !== null && <span className="hero-carousel-save">Save {formatShopPrice(saveAmount)}</span>}

                <div className="hero-carousel-chips hero-floating-chips">
                  <span className="hero-floating-chip">±0.2mm tolerance</span>
                  <span className="hero-floating-chip">Ships in 2–4 days</span>
                </div>
              </div>
            )
          })}
        </div>

        {visibleProducts.length > 1 && (
          <div className="hero-carousel-controls">
            <div className="hero-carousel-dots" aria-label="Featured products">
              {visibleProducts.map((item, dotIndex) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show ${item.name}`}
                  aria-current={dotIndex === index ? 'true' : undefined}
                  onClick={() => goToSlide(dotIndex)}
                  className={`hero-dot ${dotIndex === index ? 'hero-dot-active' : ''}`}
                />
              ))}
            </div>
            <button type="button" aria-label="Previous product" onClick={() => goToSlide(index - 1)} className="hero-carousel-arrow">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Next product" onClick={() => goToSlide(index + 1)} className="hero-carousel-arrow">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
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