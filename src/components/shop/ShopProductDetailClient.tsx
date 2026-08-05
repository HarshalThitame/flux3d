'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Box,
  ChevronDown,
  ChevronUp,
  Heart,
  MapPin,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react'
import { addToast } from '@/lib/toast/store'
import ShopVariantControls from '@/components/shop/ShopVariantControls'
import QuantityStepper from '@/components/shop/QuantityStepper'
import NotifyMeForm from '@/components/shop/NotifyMeForm'
import ProductRecommendations from '@/components/shop/ProductRecommendations'
import ReviewModal, { type ReviewEligibility } from '@/components/shop/ReviewModal'
import WishlistButton from '@/components/shop/WishlistButton'
import ProductModelModal from '@/components/shop/ProductModelModal'
import type { AppUserProfile } from '@/lib/auth/server'
import type { ShopPublicProduct, ShopPublicReview } from '@/lib/shop/public-types'
import {
  formatShopPrice,
  formatVariantLabel,
  getShopProductImages,
  getShopStockLabel,
  resolveShopSku,
  type ShopSelectedOptions,
} from '@/lib/shop/selection'
import { addRecentlyViewed } from '@/lib/shop/recentlyViewed'
import { useShopCartStore } from '@/stores/shopCartStore'
import { trackMetaEvent } from '@/lib/meta/event-utils'

function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [locked])
}

function useEscape(handler: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') handler() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handler, active])
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index + 1 <= Math.round(value) ? 'fill-[var(--shop-gold)] text-[var(--shop-gold)]' : 'text-[var(--shop-border-medium)]'}`}
        />
      ))}
    </div>
  )
}

function DetailDisclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-[var(--shop-border-light)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between py-4 text-left transition hover:text-[var(--shop-gold)]"
      >
        <span className="font-semibold text-[var(--shop-text-primary)]">{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-[var(--shop-text-muted)]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-sm leading-7 text-[var(--shop-text-secondary)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default function ShopProductDetailClient({
  product,
  initialReviews,
  currentUser,
}: {
  product: ShopPublicProduct
  initialReviews: ShopPublicReview[]
  currentUser: AppUserProfile | null
}) {
  const router = useRouter()
  const addItem = useShopCartStore((state) => state.addItem)
  const openCart = useShopCartStore((state) => state.openCart)
  const images = getShopProductImages(product)
  const [selectedImage, setSelectedImage] = useState(images[0] ?? '')
  const [selected, setSelected] = useState<ShopSelectedOptions>({})
  const [customizationText, setCustomizationText] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [pincode, setPincode] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null)
  const [checkingPincode, setCheckingPincode] = useState(false)
  const [reviews, setReviews] = useState(initialReviews)
  const [reviewPage, setReviewPage] = useState(1)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewEligibility, setReviewEligibility] = useState<ReviewEligibility | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'loading' | 'eligible' | 'not_purchased' | 'reviewed' | 'guest'>(
    currentUser ? 'loading' : 'guest'
  )
  const [toast, setToast] = useState('')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [modelOpen, setModelOpen] = useState(false)
  useScrollLock(Boolean(lightboxImage) || modelOpen)
  useEscape(() => setLightboxImage(null), Boolean(lightboxImage))

  const resolvedSku = useMemo(() => resolveShopSku(product.skus, product.variant_options, selected), [product, selected])
  const visibleImage = resolvedSku?.variant_image_url || selectedImage || images[0] || ''
  const stock = getShopStockLabel(resolvedSku)
  const maxStock = resolvedSku?.pre_order_eta ? 10 : resolvedSku?.stock_quantity ?? 1
  const canAdd = Boolean(resolvedSku && resolvedSku.is_available !== false && (resolvedSku.stock_quantity > 0 || resolvedSku.pre_order_eta))
  const isTrulyOutOfStock = Boolean(resolvedSku && resolvedSku.stock_quantity <= 0 && !resolvedSku.pre_order_eta)
  const price = resolvedSku?.price ?? product.display_price
  const compareAt = resolvedSku?.compare_at_price ?? product.compare_at_price
  const savings = compareAt && compareAt > price ? compareAt - price : 0
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: product.review_distribution[rating as 1 | 2 | 3 | 4 | 5] ?? 0,
  }))
  const totalReviews = product.review_count

  useEffect(() => {
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      slug: product.slug,
      thumbnail_url: product.thumbnail_url,
      base_price: product.base_price,
    })
  }, [product.base_price, product.id, product.name, product.slug, product.thumbnail_url])

  useEffect(() => {
    trackMetaEvent('ViewContent', {
      content_ids: product.skus.map((s) => s.sku_code),
      content_type: 'product_group',
      contents: product.skus.map((s) => ({ id: s.sku_code, quantity: 1, item_price: s.price })),
      value: product.display_price,
      currency: 'INR',
    })
  }, [product.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUser) return
    let active = true
    async function loadReviewEligibility() {
      try {
        const response = await fetch(`/api/3d-shop/reviews/eligible?productId=${product.id}`)
        const data = (await response.json().catch(() => ({}))) as {
          eligible?: ReviewEligibility | null
          hasDeliveredPurchase?: boolean
          alreadyReviewed?: boolean
        }
        if (!active) return
        if (response.ok && data.eligible) {
          setReviewEligibility(data.eligible)
          setReviewStatus('eligible')
        } else if (data.alreadyReviewed) {
          setReviewStatus('reviewed')
        } else {
          setReviewStatus('not_purchased')
        }
      } catch {
        if (active) setReviewStatus('not_purchased')
      }
    }
    void loadReviewEligibility()
    return () => { active = false }
  }, [currentUser, product.id])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  function addCurrentToCart(goToCheckout = false) {
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
    trackMetaEvent('AddToCart', {
      content_ids: [resolvedSku.sku_code],
      content_type: 'product',
      contents: [{ id: resolvedSku.sku_code, quantity, item_price: resolvedSku.price }],
      value: resolvedSku.price * quantity,
      currency: 'INR',
    })
    addToast({ type: 'success', title: 'Added to cart', description: `${product.name}` })
    if (goToCheckout) {
      router.push('/3d-shop/checkout')
    }
  }

  async function checkPincode() {
    if (!/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus('Enter a valid 6-digit pincode.')
      return
    }
    setCheckingPincode(true)
    try {
      const response = await fetch(`/api/3d-shop/pincode/${pincode.trim()}`)
      const data = (await response.json()) as { serviceable?: boolean; city?: string; state?: string }
      setPincodeStatus(
        data.serviceable
          ? `Delivered to ${data.city}${data.state ? `, ${data.state}` : ''} · Estimated 4-7 days`
          : 'Not deliverable to this pincode'
      )
    } catch {
      setPincodeStatus('Could not check this pincode.')
    } finally {
      setCheckingPincode(false)
    }
  }

  async function loadMoreReviews() {
    setLoadingReviews(true)
    try {
      const nextPage = reviewPage + 1
      const response = await fetch(`/api/3d-shop/products/${product.slug}/reviews?page=${nextPage}&limit=10`)
      const data = (await response.json()) as { reviews?: ShopPublicReview[] }
      setReviews((current) => [...current, ...(data.reviews ?? [])])
      setReviewPage(nextPage)
    } finally {
      setLoadingReviews(false)
    }
  }

  function renderReviewAction() {
    if (reviewStatus === 'guest') {
      return (
        <button
          type="button"
          onClick={() => router.push(`/login?next=${encodeURIComponent(`/3d-shop/product/${product.slug}`)}`)}
          className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-4 text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
        >
          Login to Write a Review
        </button>
      )
    }
    if (reviewStatus === 'eligible') {
      return (
        <button
          type="button"
          onClick={() => setReviewModalOpen(true)}
          className="min-h-[44px] rounded-xl bg-[var(--shop-gold)] px-4 text-sm font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]"
        >
          Write a Review
        </button>
      )
    }
    if (reviewStatus === 'reviewed') {
      return (
        <div className="min-h-[44px] rounded-xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-3 text-sm font-semibold text-[var(--shop-gold)]">
          You&apos;ve reviewed this product ✓
        </div>
      )
    }
    return (
      <button
        type="button"
        disabled
        title={reviewStatus === 'loading' ? 'Checking eligibility' : 'Purchase this product to leave a review'}
        className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] px-4 text-sm font-semibold text-[var(--shop-text-muted)] opacity-60"
      >
        {reviewStatus === 'loading' ? 'Checking...' : 'Write a Review'}
      </button>
    )
  }

  return (
    <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
      {toast && (
        <div className="fixed bottom-5 right-5 z-[130] rounded-2xl border border-[var(--shop-border-light)] bg-white px-4 py-3 text-sm font-semibold text-[var(--shop-text-primary)] shadow-xl">
          {toast}
        </div>
      )}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[140] grid place-items-center bg-[var(--shop-text-primary)]/85 p-4 backdrop-blur-md"
            onClick={() => setLightboxImage(null)}
          >
            <button type="button" aria-label="Close image preview" className="absolute inset-0" onClick={() => setLightboxImage(null)} />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 aspect-square w-full max-w-3xl overflow-hidden rounded-[var(--shop-radius-xl)] bg-white"
              onClick={(event) => event.stopPropagation()}
            >
              <Image src={lightboxImage} alt="Review image" fill sizes="90vw" className="object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl">
        <nav className="mb-6 flex flex-wrap gap-2 text-sm text-[var(--shop-text-muted)]">
          <Link href="/" className="transition hover:text-[var(--shop-gold)]">Home</Link>
          <span>/</span>
          <Link href="/3d-shop" className="transition hover:text-[var(--shop-gold)]">3D Shop</Link>
          {product.category_slug && (
            <>
              <span>/</span>
              <Link href={`/3d-shop/category/${product.category_slug}`} className="transition hover:text-[var(--shop-gold)]">{product.category_name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-[var(--shop-text-primary)]">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
          <section>
            <button
              type="button"
              onClick={() => visibleImage && setLightboxImage(visibleImage)}
              className="relative aspect-square w-full overflow-hidden rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white shadow-[var(--shop-shadow-sm)] transition hover:shadow-[var(--shop-shadow-md)]"
            >
              {visibleImage ? (
                <Image src={visibleImage} alt={product.name} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-6xl text-[var(--shop-text-subtle)]">🧩</div>
              )}
            </button>
            {images.length > 1 && (
              <div className="mt-4 grid auto-cols-[84px] grid-flow-col gap-3 overflow-x-auto">
                {images.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`relative aspect-square overflow-hidden rounded-2xl border bg-white transition hover:border-[var(--shop-border-gold)] ${visibleImage === image ? 'border-[var(--shop-gold)]' : 'border-[var(--shop-border-light)]'}`}
                  >
                    <Image src={image} alt={product.name} fill sizes="84px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
            {product.model_url && (
              <button
                type="button"
                onClick={() => setModelOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-3 text-sm font-semibold text-[var(--shop-gold)] transition hover:border-[var(--shop-gold)] hover:bg-[var(--shop-gold-soft)]"
              >
                <Box className="h-4 w-4" />
                View interactive 3D preview
              </button>
            )}
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] md:p-6">
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-[var(--shop-font-heading)] min-w-0 text-lg font-semibold leading-snug text-[var(--shop-text-primary)] md:text-xl">
                  {product.name}
                </h1>
                <WishlistButton productId={product.id} label className="shrink-0 rounded-xl border-[var(--shop-border-light)]" />
              </div>

              {product.review_count > 0 && (
                <a href="#reviews" className="mt-3 flex items-center gap-2 text-sm text-[var(--shop-text-muted)] transition hover:text-[var(--shop-gold)]">
                  <Stars value={product.avg_rating} />
                  <span>({product.review_count} reviews)</span>
                </a>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {compareAt && compareAt > price ? (
                  <>
                    <span className="text-xl text-[var(--shop-text-subtle)] line-through">{formatShopPrice(compareAt)}</span>
                    <span className="font-[var(--shop-font-heading)] text-3xl font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(price)}</span>
                    <span className="rounded-full bg-[var(--shop-gold-faint)] px-3 py-1 text-xs font-semibold text-[var(--shop-gold)]">Save {formatShopPrice(savings)}</span>
                  </>
                ) : (
                  <span className="font-[var(--shop-font-heading)] text-3xl font-semibold text-[var(--shop-text-primary)]">
                    {resolvedSku ? formatShopPrice(price) : `From ${formatShopPrice(price)}`}
                  </span>
                )}
              </div>

              <div className="mt-6">
                <ShopVariantControls
                  options={product.variant_options}
                  selected={selected}
                  onChangeAction={(name, value) => setSelected((current) => ({ ...current, [name]: value }))}
                />
              </div>

              {resolvedSku === null && product.skus.length > 0 && product.variant_options.length > 0 && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  This combination is not available
                </p>
              )}

              <p className={`mt-5 rounded-xl px-3 py-2 text-sm font-semibold ${
                stock.tone === 'green' ? 'bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]' :
                  stock.tone === 'amber' ? 'bg-amber-50 text-amber-700' :
                    stock.tone === 'red' ? 'bg-red-50 text-red-700' :
                      stock.tone === 'blue' ? 'bg-blue-50 text-blue-700' :
                        'bg-[var(--shop-bg-soft)] text-[var(--shop-text-muted)]'
              }`}>
                {stock.label}
              </p>

              {product.is_customizable && (
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-sm font-semibold text-[var(--shop-text-primary)]">
                    {product.customization_label || 'Customization'}
                  </span>
                  <input
                    value={customizationText}
                    maxLength={50}
                    onChange={(event) => setCustomizationText(event.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
                  />
                  <span className="mt-1 block text-xs text-[var(--shop-text-muted)]">This will be used for personalization · {customizationText.length}/50</span>
                </label>
              )}

              {canAdd && (
                <div className="mt-5">
                  <QuantityStepper value={quantity} max={maxStock} onChangeAction={setQuantity} />
                </div>
              )}

              <form
                className="mt-5 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  void checkPincode()
                }}
              >
                <input
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Check delivery to your pincode"
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
                />
                <button
                  type="submit"
                  disabled={checkingPincode}
                  className="rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-4 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  Check
                </button>
              </form>
              {pincodeStatus && <p className={`mt-2 text-sm font-semibold ${pincodeStatus.includes('Delivered') ? 'text-[var(--shop-gold)]' : 'text-[var(--shop-text-secondary)]'}`}>{pincodeStatus}</p>}

              {isTrulyOutOfStock && resolvedSku ? (
                <NotifyMeForm
                  productId={product.id}
                  skuId={resolvedSku.id}
                  variantLabel={formatVariantLabel(resolvedSku.variant_combination)}
                  initialEmail={currentUser?.email ?? ''}
                />
              ) : (
                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addCurrentToCart(false)}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] text-base font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addCurrentToCart(true)}
                    className="min-h-[52px] rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] text-base font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Buy Now
                  </button>
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { icon: ShieldCheck, label: 'QA checked' },
                  { icon: Truck, label: '4-7 day delivery' },
                  { icon: RefreshCcw, label: '7-day returns' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 text-center">
                    <item.icon className="h-4 w-4 text-[var(--shop-gold)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <DetailDisclosure title="Description" defaultOpen>
                  {product.long_description ? (
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.long_description }} />
                  ) : (
                    product.description || 'Details coming soon.'
                  )}
                </DetailDisclosure>
                <DetailDisclosure title="Specifications">
                  <div className="grid gap-2">
                    <div>SKU: {resolvedSku?.sku_code ?? 'Select options'}</div>
                    <div>Weight: {resolvedSku?.weight_grams ? `${resolvedSku.weight_grams} grams` : 'Select options'}</div>
                  </div>
                </DetailDisclosure>
                <DetailDisclosure title="Shipping & Returns">
                  Orders are shipped within 1-2 business days. Standard delivery: 4-7 business days. Easy 7-day return policy on unused items.
                </DetailDisclosure>
              </div>
            </div>
          </aside>
        </div>

        <section id="reviews" className="mt-20 rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">Customer Reviews</h2>
              <p className="mt-2 text-sm font-medium text-[var(--shop-text-muted)]">
                {totalReviews > 0 ? `Based on ${totalReviews} review${totalReviews === 1 ? '' : 's'}` : 'No reviews yet.'}
              </p>
            </div>
            {renderReviewAction()}
          </div>

          {totalReviews > 0 ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
              <div>
                <div className="rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-5">
                  <div className="font-[var(--shop-font-heading)] text-5xl font-semibold text-[var(--shop-text-primary)]">{product.avg_rating.toFixed(1)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={product.avg_rating} />
                    <span className="text-sm font-medium text-[var(--shop-text-muted)]">Based on {totalReviews} reviews</span>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {distribution.map((item) => (
                    <div key={item.rating} className="flex items-center gap-3 text-sm">
                      <span className="w-8 font-medium text-[var(--shop-text-secondary)]">{item.rating}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--shop-bg-muted)]">
                        <div className="h-full rounded-full bg-[var(--shop-gold)]" style={{ width: `${totalReviews ? (item.count / totalReviews) * 100 : 0}%` }} />
                      </div>
                      <span className="w-10 text-right text-[var(--shop-text-muted)]">{totalReviews ? Math.round((item.count / totalReviews) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Stars value={review.rating} />
                          {review.is_verified_purchase && <span className="rounded-full bg-[var(--shop-gold-faint)] px-2 py-0.5 text-[10px] font-bold text-[var(--shop-gold)]">Verified Purchase</span>}
                        </div>
                        <h3 className="mt-2 font-semibold text-[var(--shop-text-primary)]">{review.title || 'Review'}</h3>
                      </div>
                      <div className="text-xs text-[var(--shop-text-muted)]">
                        {review.created_at ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(review.created_at)) : ''}
                      </div>
                    </div>
                    {review.body && <p className="mt-3 text-sm leading-7 text-[var(--shop-text-secondary)]">{review.body}</p>}
                    {review.image_urls.length > 0 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto">
                        {review.image_urls.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--shop-border-light)] bg-white"
                          >
                            <Image src={url} alt="Review image" fill sizes="64px" className="object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-xs font-semibold text-[var(--shop-text-muted)]">{review.reviewer_name}</p>
                  </article>
                ))}
                {reviews.length < totalReviews && (
                  <button
                    type="button"
                    onClick={loadMoreReviews}
                    disabled={loadingReviews}
                    className="min-h-[44px] rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] px-4 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                  >
                    {loadingReviews ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-[var(--shop-text-muted)]">No reviews yet.</p>
          )}
        </section>

        <ProductRecommendations
          title="You Might Also Like"
          productId={product.id}
          categoryId={product.category_id}
          limit={6}
        />
      </div>

      <ReviewModal
        open={reviewModalOpen}
        product={product}
        eligibility={reviewEligibility}
        onOpenChangeAction={setReviewModalOpen}
        onSubmittedAction={(message) => {
          setReviewStatus('reviewed')
          setReviewEligibility(null)
          setToast(message || "Review submitted! It'll appear after approval.")
        }}
      />
      {product.model_url && (
        <ProductModelModal
          open={modelOpen}
          modelUrl={product.model_url}
          productName={product.name}
          onClose={() => setModelOpen(false)}
        />
      )}
    </main>
  )
}
