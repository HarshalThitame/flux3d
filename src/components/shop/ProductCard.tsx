'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { Box, ShoppingBag, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { addToast } from '@/lib/toast/store'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import {
  formatShopPrice,
  formatVariantLabel,
  getShopProductBadge,
  getShopProductImages,
} from '@/lib/shop/selection'
import { useShopCartStore } from '@/stores/shopCartStore'
import QuickAddModal from '@/components/shop/QuickAddModal'
import { trackMetaEvent } from '@/lib/meta/event-utils'
import WishlistButton from '@/components/shop/WishlistButton'
import ProductModelModal from '@/components/shop/ProductModelModal'

export default function ProductCard({
  product,
  actionLabel = 'Add',
  index = 0,
}: {
  product: ShopPublicProduct
  actionLabel?: string
  index?: number
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const addItem = useShopCartStore((state) => state.addItem)

  useEffect(() => { setMounted(true) }, [])
  const images = getShopProductImages(product)
  const badge = getShopProductBadge(product)
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
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="group relative flex flex-col overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] shadow-[var(--shop-shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--shop-border-gold)] hover:shadow-[var(--shop-shadow-md)]"
      >
        <WishlistButton productId={product.id} className="absolute right-3 top-3 z-10" />
        <Link href={`/3d-shop/product/${product.slug}`} className="relative block">
          <div className="relative aspect-square overflow-hidden bg-[var(--shop-bg-muted)]">
            {images[0] ? (
              <Image
                src={images[0]}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full place-items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] text-2xl text-[var(--shop-text-subtle)]">
                  <Box className="h-6 w-6" />
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
              {badge ? (
                <span className="rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)]/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)] shadow-[var(--shop-shadow-sm)] backdrop-blur-sm">
                  {badge}
                </span>
              ) : (
                <span />
              )}
              {hasModel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--shop-border-gold)] bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)] shadow-[var(--shop-shadow-sm)] backdrop-blur-sm">
                  <Box className="h-3 w-3" />
                  3D
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2 px-5 pt-5">
            <h3 className="font-[var(--shop-font-heading)] line-clamp-2 min-h-[44px] text-base font-semibold leading-snug text-[var(--shop-text-primary)]">
              {product.name}
            </h3>
            {product.review_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--shop-text-muted)]">
                <Star className="h-3.5 w-3.5 fill-[var(--shop-gold)] text-[var(--shop-gold)]" />
                <span className="font-semibold text-[var(--shop-text-primary)]">{product.avg_rating.toFixed(1)}</span>
                <span>({product.review_count})</span>
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(product.display_price)}</span>
              {product.has_sale && product.compare_at_price ? (
                <span className="text-sm text-[var(--shop-text-subtle)] line-through">{formatShopPrice(product.compare_at_price)}</span>
              ) : null}
            </div>
          </div>
        </Link>
        <div className="mt-auto px-5 pb-5 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={product.variant_options.length === 0 && !canDirectAdd}
              onClick={handleAdd}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] px-3 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-text-secondary)] hover:shadow-[var(--shop-shadow-md)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {added ? 'Added' : actionLabel}
            </button>
            {hasModel && (
              <button
                type="button"
                onClick={() => setModelOpen(true)}
                aria-label="View 3D preview"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-3 text-sm font-semibold text-[var(--shop-gold)] transition hover:border-[var(--shop-gold)] hover:bg-[var(--shop-gold-soft)]"
              >
                <Box className="h-4 w-4" />
                3D
              </button>
            )}
          </div>
        </div>
      </motion.article>
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
    </>
  )
}
