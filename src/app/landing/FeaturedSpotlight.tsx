'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { Box, ShoppingBag, Star } from 'lucide-react'
import { addToast } from '@/lib/toast/store'
import { formatShopPrice, formatVariantLabel, getShopProductBadge, getShopProductImages } from '@/lib/shop/selection'
import { useShopCartStore } from '@/stores/shopCartStore'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import { trackMetaEvent } from '@/lib/meta/event-utils'
import QuickAddModal from '@/components/shop/QuickAddModal'
import ProductModelModal from '@/components/shop/ProductModelModal'

const ROTATION_MS = 6000

export default function FeaturedSpotlight({ products }: { products: ShopPublicProduct[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const intervalRef = useRef<number | null>(null)
  const addItem = useShopCartStore((state) => state.addItem)

  const count = products.length
  const rotationPaused = paused || quickAddOpen || modelOpen

  useEffect(() => {
    if (count <= 1) return
    if (!rotationPaused) {
      intervalRef.current = window.setInterval(() => {
        if (document.visibilityState !== 'hidden') {
          setActiveIndex((current) => (current + 1) % count)
        }
      }, ROTATION_MS)
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [count, rotationPaused])

  if (count === 0) return null

  const product = products[activeIndex]
  const images = getShopProductImages(product)
  const image = images[0] ?? null
  const badge = getShopProductBadge(product)
  const onSale = product.has_sale && product.compare_at_price !== null && product.compare_at_price > product.display_price
  const saveAmount = onSale ? Math.round((product.compare_at_price as number) - product.display_price) : null
  const directSku = product.variant_options.length === 0 ? product.skus.find((sku) => sku.is_available !== false) ?? null : null
  const canDirectAdd = Boolean(directSku && (directSku.stock_quantity > 0 || directSku.pre_order_eta))
  const hasModel = Boolean(product.model_url)

  function handleAdd() {
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
    <div
      className="hero-spotlight"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="hero-spotlight-card premium-machine-panel hero-shop-panel group overflow-hidden">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[rgba(76,29,149,0.10)] bg-[var(--shop-bg-muted)]">
          <Link href={`/3d-shop/product/${product.slug}`} className="block h-full w-full">
            {image ? (
              <Image
                src={image}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 1024px) 460px, 100vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <Box className="h-10 w-10 text-[#6d28d9]/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b1d]/20 via-transparent to-transparent" />
          </Link>

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {badge && (
              <span className="rounded-full border border-[#d4af37]/40 bg-[#fdf6e3] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#7a5d12] shadow-sm">
                {badge}
              </span>
            )}
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

          {hasModel && (
            <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#4B5563] shadow-sm backdrop-blur">
              <Box className="h-3 w-3" />
              3D Preview
            </span>
          )}
        </div>

        <div className="mt-4 px-1">
          {product.category_name && (
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6d28d9]">{product.category_name}</div>
          )}
          <Link href={`/3d-shop/product/${product.slug}`} className="block">
            <h2 className="mt-1 line-clamp-2 text-[clamp(1.15rem,1.9vw,1.45rem)] font-black leading-[1.15] text-[#070b1d] transition hover:text-[#6d28d9]">
              {product.name}
            </h2>
          </Link>
          {product.review_count > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" />
              <span className="font-bold text-[#070b1d]">{product.avg_rating.toFixed(1)}</span>
              <span className="font-semibold text-[#4B5563]">({product.review_count} reviews)</span>
            </div>
          )}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#070b1d]">{formatShopPrice(product.display_price)}</span>
            {product.compare_at_price && onSale && (
              <span className="text-sm font-semibold text-[#4B5563] line-through">{formatShopPrice(product.compare_at_price)}</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2 px-1">
          <button
            type="button"
            disabled={product.variant_options.length === 0 && !canDirectAdd}
            onClick={handleAdd}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#070b1d] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(7,11,29,0.22)] transition hover:bg-[#4c1d95] hover:shadow-[0_12px_30px_rgba(109,40,217,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            {added ? 'Added' : 'Add to Cart'}
          </button>
          {hasModel && (
            <button
              type="button"
              onClick={() => setModelOpen(true)}
              aria-label="View 3D preview"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#d4af37]/50 bg-[#fdf6e3] px-4 text-sm font-bold text-[#7a5d12] transition hover:border-[#d4af37] hover:bg-[#fbf0d3]"
            >
              <Box className="h-4 w-4" />
              3D
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5" aria-label="Featured products">
            {products.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.name}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
                className={`hero-dot ${index === activeIndex ? 'hero-dot-active' : ''}`}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4B5563]">
            {product.stock_status === 'low_stock' ? 'Low stock — order soon' : 'Ships in 2–4 days'}
          </span>
        </div>
      </div>

      <div className="hero-floating-chips">
        <span className="hero-floating-chip">±0.2mm tolerance</span>
        <span className="hero-floating-chip">Ships in 2–4 days</span>
      </div>

      {mounted && createPortal(
        <QuickAddModal product={product} open={quickAddOpen} onOpenChangeAction={setQuickAddOpen} />,
        document.body
      )}
      {mounted && hasModel && product.model_url && createPortal(
        <ProductModelModal
          open={modelOpen}
          modelUrl={product.model_url}
          productName={product.name}
          onClose={() => setModelOpen(false)}
        />,
        document.body
      )}
    </div>
  )
}