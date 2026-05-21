'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, ShoppingBag, X } from 'lucide-react'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import {
  formatShopPrice,
  formatVariantLabel,
  getShopProductImages,
  getShopStockLabel,
  resolveShopSku,
  type ShopSelectedOptions,
} from '@/lib/shop/selection'
import ShopVariantControls from '@/components/shop/ShopVariantControls'
import QuantityStepper from '@/components/shop/QuantityStepper'
import { useShopCartStore } from '@/stores/shopCartStore'

export default function QuickAddModal({
  product,
  open,
  onOpenChangeAction,
}: {
  product: ShopPublicProduct
  open: boolean
  onOpenChangeAction: (open: boolean) => void
}) {
  const addItem = useShopCartStore((state) => state.addItem)
  const [selected, setSelected] = useState<ShopSelectedOptions>({})
  const [quantity, setQuantity] = useState(1)
  const [customizationText, setCustomizationText] = useState('')
  const [added, setAdded] = useState(false)
  const images = getShopProductImages(product)
  const resolvedSku = useMemo(() => resolveShopSku(product.skus, product.variant_options, selected), [product, selected])
  const stock = getShopStockLabel(resolvedSku)
  const maxStock = resolvedSku?.pre_order_eta ? 10 : resolvedSku?.stock_quantity ?? 1
  const canAdd = Boolean(resolvedSku && (resolvedSku.stock_quantity > 0 || resolvedSku.pre_order_eta))

  function addToCart() {
    if (!resolvedSku || !canAdd) return
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      categoryId: product.category_id,
      categoryName: product.category_name,
      categorySlug: product.category_slug,
      thumbnail: resolvedSku.variant_image_url || product.thumbnail_url || images[0] || '',
      skuId: resolvedSku.id,
      skuCode: resolvedSku.sku_code,
      variantCombination: resolvedSku.variant_combination,
      variantLabel: formatVariantLabel(resolvedSku.variant_combination),
      customizationText,
      price: resolvedSku.price,
      compareAtPrice: resolvedSku.compare_at_price,
      quantity,
      maxStock,
    })
    setAdded(true)
    window.setTimeout(() => {
      setAdded(false)
      onOpenChangeAction(false)
    }, 700)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button
            type="button"
            aria-label="Close quick add"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            onClick={() => onOpenChangeAction(false)}
          />
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-3xl border border-[var(--border-light)] bg-[var(--bg-base)] p-5 shadow-[var(--shadow-lg)] md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-[min(92vw,560px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--bg-muted)]">
                  {images[0] ? <Image src={images[0]} alt={product.name} fill sizes="64px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-lg font-bold text-[var(--text-primary)]">{product.name}</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatShopPrice(resolvedSku?.price ?? product.display_price)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChangeAction(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-light)] bg-white text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <ShopVariantControls
                options={product.variant_options}
                selected={selected}
                onChangeAction={(name, value) => setSelected((current) => ({ ...current, [name]: value }))}
              />

              {product.is_customizable && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">
                    {product.customization_label || 'Customization'}
                  </span>
                  <input
                    value={customizationText}
                    maxLength={50}
                    onChange={(event) => setCustomizationText(event.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--border-light)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-brand)]"
                  />
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">{customizationText.length}/50</span>
                </label>
              )}

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-light)] bg-white p-4">
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {resolvedSku ? formatShopPrice(resolvedSku.price) : `From ${formatShopPrice(product.display_price)}`}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{stock.label}</div>
                </div>
                <QuantityStepper value={quantity} max={maxStock} onChangeAction={setQuantity} />
              </div>

              <button
                type="button"
                disabled={!canAdd}
                onClick={addToCart}
                className="btn-primary flex min-h-[52px] w-full items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                {added ? (
                  'Added to cart ✓'
                ) : resolvedSku ? (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4" />
                    Select Options
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
