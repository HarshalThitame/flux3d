'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'

type Props = {
  token: string
  orderContext: {
    itemDescription: string
    customerName: string
  }
}

export default function ReviewPageClient({ token, orderContext }: Props) {
  const [step, setStep] = useState<'input' | 'draft' | 'success'>('input')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [rawInput, setRawInput] = useState('')
  const [draft, setDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [consentDisplay, setConsentDisplay] = useState(true)
  const [customerName, setCustomerName] = useState(orderContext.customerName)

  const handleGenerate = async () => {
    if (rating === 0) return alert('Please select a rating')
    if (!rawInput.trim()) return alert('Please write a few words')
    
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/review/${token}/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, raw_input: rawInput, item_description: orderContext.itemDescription })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDraft(data.draft)
      setStep('draft')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const website = formData.get('website') as string
    
    try {
      const res = await fetch(`/api/review/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          raw_customer_input: rawInput,
          review_text: draft,
          consent_display: consentDisplay,
          customer_display_name: customerName,
          website
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStep('success')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <AnimatePresence mode="wait">
        {step === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you, {orderContext.customerName}!</h2>
            <p className="text-gray-600">Your review helps us grow and improve.</p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-xl font-semibold text-gray-900">How was your order?</h1>
              <p className="text-sm text-gray-500 mt-1">{orderContext.itemDescription}</p>
            </div>

            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoverRating || rating)
                        ? 'fill-[#FF5C1A] text-[#FF5C1A]'
                        : 'fill-gray-100 text-gray-300'
                    } transition-colors`}
                  />
                </motion.button>
              ))}
            </div>

            {step === 'input' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  In a few words, how was your experience?
                </label>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="e.g. Quality was amazing, fast shipping..."
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF5C1A] focus:ring-[#FF5C1A] p-3 text-sm min-h-[100px]"
                />
                <button
                  onClick={handleGenerate}
                  disabled={!rating || !rawInput.trim() || isGenerating}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-[#0F1B3D] text-white py-3 rounded-lg font-medium hover:bg-[#0F1B3D]/90 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isGenerating ? 'Writing draft...' : 'Write my review'}
                </button>
              </motion.div>
            )}

            {step === 'draft' && (
              <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between items-center">
                  <span>Your AI-Enhanced Review</span>
                  <button type="button" onClick={handleGenerate} className="text-[#FF5C1A] text-xs hover:underline flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Regenerate
                  </button>
                </label>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF5C1A] focus:ring-[#FF5C1A] p-3 text-sm min-h-[120px] mb-4"
                />
                
                <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={consentDisplay}
                      onChange={(e) => setConsentDisplay(e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-[#FF5C1A] focus:ring-[#FF5C1A]"
                    />
                    <span className="text-sm text-gray-600">Show my name with this review</span>
                  </label>
                  
                  {consentDisplay && (
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF5C1A] focus:ring-[#FF5C1A] text-sm"
                      placeholder="Your name"
                    />
                  )}
                </div>

                <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />

                <button
                  type="submit"
                  disabled={isSubmitting || !draft.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF5C1A] text-white py-3 rounded-lg font-medium hover:bg-[#e04f14] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </motion.form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
