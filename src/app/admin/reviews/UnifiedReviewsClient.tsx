'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Star, ExternalLink, Loader2 } from 'lucide-react'
import { Review, ReviewStatus } from '@/lib/reviews/types'


export default function UnifiedReviewsClient() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected' | 'all'>('pending_review')
  const [page, setPage] = useState(1)

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const url = new URL(window.location.origin + '/api/admin/reviews')
      if (filter !== 'all') url.searchParams.set('status', filter)
      url.searchParams.set('page', page.toString())
      
      const res = await fetch(url.toString())
      const data = await res.json()
      if (data.reviews) {
        setReviews(data.reviews)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [filter, page])

  const handleUpdate = async (id: string, updates: Partial<Review>) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        fetchReviews()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Reviews Moderation</h1>
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100 w-fit">
        {(['pending_review', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-[#0F1B3D] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-lg border border-gray-100 text-gray-500">
          No reviews found.
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map(review => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6"
            >
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">{review.customer_display_name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{review.order_type}</span>
                  {review.status === 'pending_review' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Pending</span>}
                  {review.status === 'approved' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approved</span>}
                  {review.status === 'rejected' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Rejected</span>}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Final Review:</p>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">{review.review_text}</p>
                </div>

                {review.raw_customer_input && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Raw Input:</p>
                    <p className="text-gray-600 italic text-sm">{review.raw_customer_input}</p>
                  </div>
                )}
                
                <div className="text-xs text-gray-400 flex gap-4">
                  <span>Submitted: {new Date(review.submitted_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[140px] border-l pl-6">
                {review.status !== 'approved' && (
                  <button
                    onClick={() => handleUpdate(review.id, { status: 'approved' })}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm font-medium"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button
                    onClick={() => handleUpdate(review.id, { status: 'rejected' })}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm font-medium"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                )}
                <button
                  onClick={() => handleUpdate(review.id, { featured: !review.featured })}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                    review.featured ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Star className={`w-4 h-4 ${review.featured ? 'fill-yellow-400 text-yellow-500' : ''}`} />
                  {review.featured ? 'Featured' : 'Feature'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
