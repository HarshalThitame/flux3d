'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Eye, Star } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type ReviewTab = 'pending' | 'approved' | 'all'
type AdminReview = {
  id: string
  product_id: string
  user_id: string
  order_id: string
  rating: number
  title: string | null
  body: string | null
  image_urls: string[]
  is_verified_purchase: boolean
  is_approved: boolean
  admin_reply: string | null
  admin_replied_at: string | null
  created_at: string | null
  updated_at: string | null
  product?: { id: string; name: string; slug: string; thumbnail_url: string | null } | null
  order?: { id: string; order_number: string } | null
  reviewer?: { name: string; email: string | null }
}

const tabs: Array<{ key: ReviewTab; label: string }> = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
]

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={`h-3.5 w-3.5 ${index + 1 <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

const PAGE_SIZE = 20

export default function AdminShopReviewsClient() {
  const [tab, setTab] = useState<ReviewTab>('pending')
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [replying, setReplying] = useState<Record<string, boolean>>({})
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<AdminToastState>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) })
    if (tab === 'pending') params.set('is_approved', 'false')
    if (tab === 'approved') params.set('is_approved', 'true')
    return params.toString()
  }, [tab, page])

  const loadReviews = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/3d-shop/admin/reviews?${queryString}`)
      const data = await response.json().catch(() => ({})) as { reviews?: AdminReview[]; total?: number; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load reviews.')
      setReviews(data.reviews ?? [])
      setTotal(data.total ?? 0)
      setExpanded({})
      setReplying({})
      setReplyText({})
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load reviews.' })
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReviews()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadReviews])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function updateReview(reviewId: string, isApproved: boolean) {
    try {
      const response = await fetch(`/api/3d-shop/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: isApproved }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to update review.')
      setToast({ type: 'success', message: isApproved ? 'Review approved.' : 'Review moved to pending.' })
      await loadReviews()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update review.' })
    }
  }

  async function submitReply(reviewId: string) {
    const text = replyText[reviewId]?.trim() ?? ''
    try {
      const response = await fetch(`/api/3d-shop/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_reply: text }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to submit reply.')
      setToast({ type: 'success', message: text ? 'Reply posted.' : 'Reply removed.' })
      setReplying((current) => ({ ...current, [reviewId]: false }))
      await loadReviews()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to submit reply.' })
    }
  }

  async function deleteReview(reviewId: string) {
    if (!window.confirm('Delete this review?')) return
    try {
      const response = await fetch(`/api/3d-shop/admin/reviews/${reviewId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to delete review.')
      setToast({ type: 'success', message: 'Review deleted.' })
      await loadReviews()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete review.' })
    }
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Star className="h-3 w-3" />
            3D Shop
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Review Moderation</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">Approve verified customer reviews before they appear on product pages.</p>
        </div>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => { setPage(1); setTab(item.key) }}
            className={`min-h-[42px] shrink-0 rounded-xl px-4 text-sm font-semibold ${
              tab === item.key ? 'bg-[#6d28d9] text-white' : 'text-[#6F7192] hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Product', 'Reviewer', 'Rating', 'Title', 'Submitted', 'Status', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading reviews...</td></tr>
              ) : reviews.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#6F7192]">No reviews found.</td></tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="border-b border-gray-100 align-top last:border-0">
                    <td className="px-4 py-3 text-sm text-[#0F1B3D]">
                      <div className="flex min-w-[220px] items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {review.product?.thumbnail_url ? (
                            <Image src={review.product.thumbnail_url} alt={review.product.name} fill sizes="40px" className="object-cover" />
                          ) : null}
                        </div>
                        <div className="font-semibold">{review.product?.name ?? 'Deleted product'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#0F1B3D]">
                      <div className="font-semibold">{review.reviewer?.name ?? 'Verified customer'}</div>
                      <div className="text-xs text-[#6F7192]">{review.reviewer?.email ?? 'No email'}</div>
                    </td>
                    <td className="px-4 py-3"><Rating value={review.rating} /></td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0F1B3D]">{review.title || 'Review'}</td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{formatDate(review.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${review.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {review.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[220px] flex-wrap gap-2">
                        {!review.is_approved && (
                          <button type="button" onClick={() => void updateReview(review.id, true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                            Approve
                          </button>
                        )}
                        {review.is_approved && (
                          <button type="button" onClick={() => void updateReview(review.id, false)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white">
                            Unapprove
                          </button>
                        )}
                        <button type="button" onClick={() => void deleteReview(review.id)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                          Delete
                        </button>
                        <button type="button" onClick={() => setExpanded((current) => ({ ...current, [review.id]: !current[review.id] }))} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#6F7192]">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button type="button" onClick={() => setReplying((current) => ({ ...current, [review.id]: !current[review.id] }))} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#6F7192]">
                          Reply
                        </button>
                      </div>
                      {expanded[review.id] && (
                        <div className="mt-3 max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-[#0F1B3D]">
                          <p>{review.body || 'No body text.'}</p>
                          {review.image_urls.length > 0 && (
                            <div className="mt-3 flex gap-2">
                              {review.image_urls.map((url) => (
                                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-white">
                                  <Image src={url} alt="Review image" fill sizes="56px" className="object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                          {review.admin_reply && (
                            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 text-sm text-indigo-900">
                              <div className="mb-1 text-xs font-bold text-indigo-700">Flux3D Team</div>
                              {review.admin_reply}
                            </div>
                          )}
                        </div>
                      )}
                      {replying[review.id] && (
                        <div className="mt-3 max-w-xl space-y-2">
                          <textarea
                            value={replyText[review.id] ?? review.admin_reply ?? ''}
                            onChange={(e) => setReplyText((current) => ({ ...current, [review.id]: e.target.value }))}
                            placeholder="Write a reply..."
                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm leading-6 text-[#0F1B3D] outline-none focus:border-[#6d28d9]"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void submitReply(review.id)} className="rounded-lg bg-[#6d28d9] px-3 py-2 text-xs font-semibold text-white">
                              Save Reply
                            </button>
                            <button type="button" onClick={() => setReplying((current) => ({ ...current, [review.id]: false }))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#6F7192]">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <div className="text-sm text-[#6F7192]">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[36px] rounded-lg border border-gray-200 px-3 text-sm font-semibold text-[#6F7192] disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
                className="min-h-[36px] rounded-lg border border-gray-200 px-3 text-sm font-semibold text-[#6F7192] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
