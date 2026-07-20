'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, Star } from 'lucide-react'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import {
  formatShopPrice,
  formatVariantLabel,
  getShopProductBadge,
  getShopProductImages,
} from '@/lib/shop/selection'
import { useShopCartStore } from '@/stores/shopCartStore'
import QuickAddModal from '@/components/shop/QuickAddModal'
import WishlistButton from '@/components/shop/WishlistButton'

export default function ProductCard({
  product,
  actionLabel = 'Add to Cart',
}: {
  product: ShopPublicProduct
  actionLabel?: string
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const addItem = useShopCartStore((state) => state.addItem)

  useEffect(() => { setMounted(true) }, [])
  const images = getShopProductImages(product)
  const badge = getShopProductBadge(product)
  const directSku = product.variant_options.length === 0 ? product.skus.find((sku) => sku.is_available !== false) ?? null : null
  const canDirectAdd = Boolean(directSku && (directSku.stock_quantity > 0 || directSku.pre_order_eta))

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
    window.setTimeout(() => setAdded(false), 1500)
  }

  return (
    <>
      <article className="group relative overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:border-[var(--border-brand)] hover:shadow-[var(--shadow-md)]">
        <WishlistButton productId={product.id} className="absolute right-3 top-3 z-10" />
        <Link href={`/3d-shop/product/${product.slug}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-[var(--bg-muted)]">
            {images[0] ? (
              <Image
                src={images[0]}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full place-items-center text-4xl">🧩</div>
            )}
            {badge && (
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)] shadow-[var(--shadow-sm)]">
                {badge}
              </span>
            )}
          </div>
          <div className="space-y-2 px-4 pt-4">
            <h3 className="line-clamp-2 min-h-[44px] text-base font-bold leading-snug text-[var(--text-primary)]">
              {product.name}
            </h3>
            {product.review_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-[var(--text-primary)]">{product.avg_rating.toFixed(1)}</span>
                <span>({product.review_count})</span>
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[var(--text-primary)]">From {formatShopPrice(product.display_price)}</span>
              {product.has_sale && product.compare_at_price ? (
                <span className="text-sm text-[var(--text-muted)] line-through">{formatShopPrice(product.compare_at_price)}</span>
              ) : null}
            </div>
          </div>
        </Link>
        <div className="px-4 pb-4 pt-3">
          <button
            type="button"
            disabled={product.variant_options.length === 0 && !canDirectAdd}
            onClick={handleAdd}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-brand)] bg-[var(--brand-faint)] px-3 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            {added ? 'Added ✓' : actionLabel}
          </button>
        </div>
      </article>
      {mounted && createPortal(
        <QuickAddModal product={product} open={quickAddOpen} onOpenChangeAction={setQuickAddOpen} />,
        document.body
      )}
    </>
  )
}
