'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, Loader2, Star, X } from 'lucide-react'
import type { ShopPublicProduct } from '@/lib/shop/public-types'
import { getShopProductImages } from '@/lib/shop/selection'

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

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first.focus()
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [active, ref])
}

export type ReviewEligibility = {
  productId: string
  productName: string
  productThumbnail: string | null
  orderId: string
  orderNumber: string
}

export default function ReviewModal({
  open,
  product,
  eligibility,
  onOpenChangeAction,
  onSubmittedAction,
}: {
  open: boolean
  product: ShopPublicProduct
  eligibility: ReviewEligibility | null
  onOpenChangeAction: (open: boolean) => void
  onSubmittedAction: (message: string) => void
}) {
  const images = getShopProductImages(product)
  const thumbnail = eligibility?.productThumbnail || product.thumbnail_url || images[0] || ''
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement | null>(null)
  useScrollLock(open)
  useEscape(() => onOpenChangeAction(false), open)
  useFocusTrap(panelRef, open)

  const activeRating = hoverRating || rating
  const canSubmit = useMemo(() => Boolean(eligibility && rating >= 1 && rating <= 5 && !submitting), [eligibility, rating, submitting])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setError(''), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  async function uploadReviewImage(file: File) {
    if (imageUrls.length >= 3) return
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', 'review')
      formData.append('productId', product.id)

      const response = await fetch('/api/3d-shop/admin/upload', { method: 'POST', body: formData })
      const data = await response.json().catch(() => ({})) as { publicUrl?: string; error?: string }
      if (!response.ok || !data.publicUrl) throw new Error(data.error || 'Upload failed.')
      setImageUrls((current) => [...current, data.publicUrl as string].slice(0, 3))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function submitReview() {
    if (!eligibility) return
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/3d-shop/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          orderId: eligibility.orderId,
          rating,
          title,
          body,
          imageUrls,
        }),
      })
      const data = await response.json().catch(() => ({})) as { message?: string; error?: string }
      if (!response.ok) throw new Error(data.error || 'Review submission failed.')

      setRating(0)
      setHoverRating(0)
      setTitle('')
      setBody('')
      setImageUrls([])
      onOpenChangeAction(false)
      onSubmittedAction(data.message || "Review submitted! It'll appear after approval.")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Review submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[130]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button
            type="button"
            aria-label="Close review modal"
            className="absolute inset-0 bg-[#1C1917]/55 backdrop-blur-sm"
            onClick={() => onOpenChangeAction(false)}
          />
          <motion.div
            ref={panelRef}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-base)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shop-shadow-lg)] md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-[min(92vw,620px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:pb-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--shop-bg-muted)]">
                  {thumbnail ? <Image src={thumbnail} alt={product.name} fill sizes="64px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-lg font-semibold text-[var(--shop-text-primary)]">{product.name}</h2>
                  {eligibility && <p className="mt-1 text-sm text-[var(--shop-text-secondary)]">Order #{eligibility.orderNumber}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChangeAction(false)}
                aria-label="Close review modal"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-2 text-sm font-bold text-[var(--shop-text-primary)]">Rating</div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1
                    return (
                      <button
                        key={value}
                        type="button"
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(value)}
                        className="rounded-lg p-1 text-[var(--shop-gold)]"
                        aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      >
                        <Star className={`h-8 w-8 ${value <= activeRating ? 'fill-[var(--shop-gold)] text-[var(--shop-gold)]' : 'text-[var(--shop-border-medium)]'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[var(--shop-text-primary)]">Title</span>
                <input
                  value={title}
                  maxLength={100}
                  onChange={(event) => setTitle(event.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm outline-none focus:border-[var(--shop-border-gold)]"
                  placeholder="What stood out?"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[var(--shop-text-primary)]">Review</span>
                <textarea
                  value={body}
                  maxLength={500}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-[140px] w-full resize-none rounded-xl border border-[var(--shop-border-light)] bg-white p-3 text-sm leading-6 outline-none focus:border-[var(--shop-border-gold)]"
                  placeholder="Share your experience"
                />
                <span className="mt-1 block text-right text-xs text-[var(--shop-text-muted)]">{body.length}/500</span>
              </label>

              <div>
                <div className="mb-2 text-sm font-bold text-[var(--shop-text-primary)]">Images</div>
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((url) => (
                    <div key={url} className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--shop-border-light)] bg-white">
                      <Image src={url} alt="Review image" fill sizes="64px" className="object-cover" />
                    </div>
                  ))}
                  {imageUrls.length < 3 && (
                    <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--shop-border-medium)] bg-white text-[var(--shop-text-secondary)]">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          event.currentTarget.value = ''
                          if (!file) return
                          void uploadReviewImage(file)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {error && <p className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitReview()}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-6 text-base font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Review
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
