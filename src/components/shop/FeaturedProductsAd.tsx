'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Sparkles, Star } from 'lucide-react'
import { addToast } from '@/lib/toast/store'
import { formatShopPrice, formatVariantLabel, getShopProductBadge, getShopProductImages } from '@/lib/shop/selection'
import { useShopCartStore } from '@/stores/shopCartStore'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import { trackMetaEvent } from '@/lib/meta/event-utils'

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white shadow-[var(--shop-shadow-sm)]">
      <div className="relative aspect-[4/3] bg-[var(--shop-bg-muted)]">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-4 w-full rounded-full bg-[var(--shop-bg-muted)] animate-pulse" />
        <div className="h-3 w-2/3 rounded-full bg-[var(--shop-bg-muted)] animate-pulse" />
        <div className="h-5 w-1/2 rounded-full bg-[var(--shop-bg-muted)] animate-pulse" />
        <div className="h-9 w-full rounded-xl bg-[var(--shop-bg-muted)] animate-pulse mt-3" />
      </div>
    </div>
  )
}

function FeaturedProductCard({ product, index }: { product: ShopPublicProduct; index: number }) {
  const [added, setAdded] = useState(false)
  const images = getShopProductImages(product)
  const badge = getShopProductBadge(product)
  const directSku = product.variant_options.length === 0 ? product.skus.find((sku) => sku.is_available !== false) ?? null : null
  const canDirectAdd = Boolean(directSku && (directSku.stock_quantity > 0 || directSku.pre_order_eta))
  const addItem = useShopCartStore((state) => state.addItem)

  function handleAdd() {
    if (!directSku || !canDirectAdd) return
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
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15 + index * 0.1, type: 'spring', stiffness: 120, damping: 16 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white shadow-[var(--shop-shadow-sm)] transition-all duration-300 hover:shadow-lg hover:shadow-[var(--shop-gold)]/10"
    >
      <Link href={`/3d-shop/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--shop-bg-muted)]">
          {images[0] ? (
            <Image
              src={images[0]}
              alt={product.name}
              fill
              sizes="50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-3xl">🧩</div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          
          {/* Badge */}
          {badge && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 300 }}
              className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] shadow-[var(--shop-shadow-sm)] ${
                badge.toLowerCase().includes('sale') || badge.toLowerCase().includes('off')
                  ? 'bg-rose-500 text-white'
                  : 'bg-[var(--shop-gold)] text-[var(--luxury-charcoal)]'
              }`}
            >
              {badge}
            </motion.span>
          )}
        </div>
        
      <div className="p-3 space-y-2 bg-white">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--shop-text-primary)] min-h-[40px]">
            {product.name}
          </h3>
          
          {/* Rating */}
          {product.review_count > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="h-3 w-3 fill-[var(--shop-gold)] text-[var(--shop-gold)]" />
              <span className="text-xs font-semibold text-[var(--shop-text-primary)]">{product.avg_rating.toFixed(1)}</span>
              <span className="text-[10px] text-[var(--shop-text-muted)]">({product.review_count})</span>
            </div>
          )}
          
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(product.display_price)}</span>
            {product.has_sale && product.compare_at_price && (
              <span className="text-xs text-[var(--shop-text-muted)] line-through">{formatShopPrice(product.compare_at_price)}</span>
            )}
          </div>
        </div>
      </Link>
      
      {/* Add to Cart Button */}
      <div className="px-3 pb-3">
        <motion.button
          type="button"
          disabled={!canDirectAdd}
          onClick={handleAdd}
          whileTap={{ scale: 0.95 }}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
            added
              ? 'bg-[var(--shop-gold)] text-[var(--luxury-charcoal)]'
              : 'bg-[var(--shop-gold)] text-[var(--luxury-charcoal)] hover:bg-[var(--shop-gold-light)] hover:shadow-md hover:shadow-[var(--shop-gold)]/20'
          }`}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.span
                key="added"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1.5"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1.5"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Add to Cart
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.article>
  )
}

export default function FeaturedProductsAd({
  productId,
  categoryId,
  tags,
}: {
  productId?: string | null
  categoryId?: string | null
  tags?: string[]
}) {
  const [products, setProducts] = useState<ShopPublicProduct[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!productId && !categoryId && (!tags || tags.length === 0)) return
    
    let active = true
    async function loadProducts() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (productId) params.set('productId', productId)
        if (categoryId) params.set('categoryId', categoryId)
        if (tags?.length) params.set('tags', tags.join(','))
        params.set('limit', '4')

        const response = await fetch(`/api/3d-shop/recommendations?${params.toString()}`)
        const data = await response.json().catch(() => ({})) as { products?: ShopPublicProduct[] }
        if (active && response.ok) setProducts(data.products ?? [])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProducts()
    return () => { active = false }
  }, [productId, categoryId, tags])

  if (!loading && products.length === 0) return null

  return (
    <section className="mt-6">
      {/* Cinematic Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--shop-bg-soft)] via-white to-[var(--shop-gold-faint)] p-4 mb-4 border border-[var(--shop-border-light)]"
      >
        {/* Animated shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer opacity-50" />
        
        <div className="relative flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--shop-gold)] to-[var(--shop-gold-light)] text-[var(--luxury-charcoal)] shadow-md shadow-[var(--shop-gold)]/30"
          >
            <Sparkles className="h-4 w-4" />
          </motion.div>
          <div>
            <h2 className="text-base font-semibold text-[var(--shop-text-primary)]">You Might Also Love</h2>
            <p className="text-[10px] font-medium text-[var(--shop-text-muted)]">Curated picks based on your order</p>
          </div>
        </div>
      </motion.div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
          : products.map((product, index) => (
              <FeaturedProductCard key={product.id} product={product} index={index} />
            ))}
      </div>
    </section>
  )
}
