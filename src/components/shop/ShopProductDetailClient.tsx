'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp, ShoppingBag, Star } from 'lucide-react'
import ShopVariantControls from '@/components/shop/ShopVariantControls'
import QuantityStepper from '@/components/shop/QuantityStepper'
import NotifyMeForm from '@/components/shop/NotifyMeForm'
import ProductRecommendations from '@/components/shop/ProductRecommendations'
import ReviewModal, { type ReviewEligibility } from '@/components/shop/ReviewModal'

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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handler() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handler, active])
}
import WishlistButton from '@/components/shop/WishlistButton'
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

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index + 1 <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-medium)]'}`}
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
    <section className="border-b border-[var(--border-light)] py-4">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between text-left">
        <span className="font-bold text-[var(--text-primary)]">{title}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{children}</div>}
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
  useScrollLock(Boolean(lightboxImage))
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
    if (!currentUser) {
      return
    }

    let active = true

    async function loadReviewEligibility() {
      try {
        const response = await fetch(`/api/3d-shop/reviews/eligible?productId=${product.id}`)
        const data = await response.json().catch(() => ({})) as {
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
    return () => {
      active = false
    }
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
    setToast(`${product.name} added to cart ✓`)
    if (goToCheckout) {
      router.push('/3d-shop/checkout')
    } else {
      openCart()
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
          className="min-h-[44px] rounded-xl border border-[var(--border-brand)] bg-[var(--brand-faint)] px-4 text-sm font-bold text-[var(--brand-primary)]"
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
          className="btn-primary min-h-[44px] px-4 text-sm"
        >
          Write a Review
        </button>
      )
    }

    if (reviewStatus === 'reviewed') {
      return (
        <div className="min-h-[44px] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          You&apos;ve reviewed this product ✓
        </div>
      )
    }

    return (
      <button
        type="button"
        disabled
        title={reviewStatus === 'loading' ? 'Checking eligibility' : 'Purchase this product to leave a review'}
        className="min-h-[44px] rounded-xl border border-[var(--border-light)] px-4 text-sm font-bold text-[var(--text-muted)] opacity-60"
      >
        {reviewStatus === 'loading' ? 'Checking...' : 'Write a Review'}
      </button>
    )
  }

  return (
    <main className="px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
      {toast && (
        <div className="fixed bottom-5 right-5 z-[130] rounded-2xl border border-[var(--border-light)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-xl">
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
            className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-md"
          >
            <button type="button" aria-label="Close image preview" className="absolute inset-0" onClick={() => setLightboxImage(null)} />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 aspect-square w-full max-w-3xl overflow-hidden rounded-3xl bg-white"
            >
              <Image src={lightboxImage} alt="Review image" fill sizes="90vw" className="object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mx-auto max-w-7xl">
        <nav className="mb-6 flex flex-wrap gap-2 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--brand-primary)]">Home</Link>
          <span>/</span>
          <Link href="/3d-shop" className="hover:text-[var(--brand-primary)]">3D Shop</Link>
          {product.category_slug && (
            <>
              <span>/</span>
              <Link href={`/3d-shop/category/${product.category_slug}`} className="hover:text-[var(--brand-primary)]">{product.category_name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-[var(--text-primary)]">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
          <section>
            <button type="button" className="relative aspect-square w-full overflow-hidden rounded-3xl border border-[var(--border-light)] bg-white shadow-[var(--shadow-sm)]">
              {visibleImage ? (
                <Image src={visibleImage} alt={product.name} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-6xl">🧩</div>
              )}
            </button>
            {images.length > 1 && (
              <div className="mt-4 grid auto-cols-[84px] grid-flow-col gap-3 overflow-x-auto">
                {images.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`relative aspect-square overflow-hidden rounded-2xl border bg-white ${visibleImage === image ? 'border-[var(--brand-primary)]' : 'border-[var(--border-light)]'}`}
                  >
                    <Image src={image} alt={product.name} fill sizes="84px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <h1 className="!text-2xl font-extrabold tracking-normal text-[var(--text-primary)] md:!text-3xl">{product.name}</h1>
                <WishlistButton productId={product.id} label className="shrink-0 rounded-xl border-[var(--border-light)]" />
              </div>

              {product.review_count > 0 && (
                <a href="#reviews" className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Stars value={product.avg_rating} />
                  <span>({product.review_count} reviews)</span>
                </a>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {compareAt && compareAt > price ? (
                  <>
                    <span className="text-xl text-[var(--text-muted)] line-through">{formatShopPrice(compareAt)}</span>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)]">{formatShopPrice(price)}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Save {formatShopPrice(savings)}</span>
                  </>
                ) : (
                  <span className="text-3xl font-extrabold text-[var(--text-primary)]">
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

              <p className={`mt-5 rounded-xl px-3 py-2 text-sm font-bold ${
                stock.tone === 'green' ? 'bg-emerald-50 text-emerald-700' :
                  stock.tone === 'amber' ? 'bg-amber-50 text-amber-700' :
                    stock.tone === 'red' ? 'bg-red-50 text-red-700' :
                      stock.tone === 'blue' ? 'bg-blue-50 text-blue-700' :
                        'bg-[var(--bg-soft)] text-[var(--text-muted)]'
              }`}>
                {stock.label}
              </p>

              {product.is_customizable && (
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">
                    {product.customization_label || 'Customization'}
                  </span>
                  <input
                    value={customizationText}
                    maxLength={50}
                    onChange={(event) => setCustomizationText(event.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-soft)] px-3 text-sm outline-none focus:border-[var(--border-brand)]"
                  />
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">This will be used for personalization · {customizationText.length}/50</span>
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
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[var(--border-light)] bg-[var(--bg-soft)] px-3 text-sm outline-none focus:border-[var(--border-brand)]"
                />
                <button type="submit" disabled={checkingPincode} className="rounded-xl border border-[var(--border-light)] px-4 text-sm font-bold text-[var(--text-primary)]">
                  Check
                </button>
              </form>
              {pincodeStatus && <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">{pincodeStatus}</p>}

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
                    className="btn-primary flex min-h-[52px] w-full items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addCurrentToCart(true)}
                    className="min-h-[52px] rounded-xl border border-[var(--border-light)] bg-[var(--bg-soft)] text-base font-bold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Buy Now
                  </button>
                </div>
              )}

              <div className="mt-4">
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

        <section id="reviews" className="mt-16 rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h2 className="!text-2xl font-extrabold text-[var(--text-primary)]">Customer Reviews</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                {totalReviews > 0 ? `Based on ${totalReviews} review${totalReviews === 1 ? '' : 's'}` : 'No reviews yet.'}
              </p>
            </div>
            {renderReviewAction()}
          </div>

          {totalReviews > 0 ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-5">
                  <div className="text-5xl font-extrabold text-[var(--text-primary)]">{product.avg_rating.toFixed(1)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={product.avg_rating} />
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">Based on {totalReviews} reviews</span>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                {distribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-3 text-sm">
                    <span className="w-8 font-semibold">{item.rating}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                      <div className="h-full rounded-full bg-yellow-400" style={{ width: `${totalReviews ? (item.count / totalReviews) * 100 : 0}%` }} />
                    </div>
                    <span className="w-10 text-right text-[var(--text-muted)]">{totalReviews ? Math.round((item.count / totalReviews) * 100) : 0}%</span>
                  </div>
                ))}
                </div>
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Stars value={review.rating} />
                          {review.is_verified_purchase && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Verified Purchase</span>}
                        </div>
                        <h3 className="mt-2 font-bold text-[var(--text-primary)]">{review.title || 'Review'}</h3>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {review.created_at ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(review.created_at)) : ''}
                      </div>
                    </div>
                    {review.body && <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{review.body}</p>}
                    {review.image_urls.length > 0 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto">
                        {review.image_urls.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border-light)] bg-white"
                          >
                            <Image src={url} alt="Review image" fill sizes="64px" className="object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">{review.reviewer_name}</p>
                  </article>
                ))}
                {reviews.length < totalReviews && (
                  <button
                    type="button"
                    onClick={loadMoreReviews}
                    disabled={loadingReviews}
                    className="min-h-[44px] rounded-xl border border-[var(--border-light)] px-4 text-sm font-bold text-[var(--text-primary)]"
                  >
                    {loadingReviews ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-[var(--text-secondary)]">No reviews yet.</p>
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
    </main>
  )
}
