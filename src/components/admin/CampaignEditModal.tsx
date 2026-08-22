'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  AlertCircle,
  Pencil,
  IndianRupee,
  CheckCircle2,
} from 'lucide-react'

type CampaignEditModalProps = {
  campaign: {
    id: string
    name: string
    daily_budget?: string
  } | null
  onClose: () => void
  onSave: () => void
}

export default function CampaignEditModal({ campaign, onClose, onSave }: CampaignEditModalProps) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [budget, setBudget] = useState(
    campaign?.daily_budget ? Number(campaign.daily_budget) / 100 : 150,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state when campaign changes
  useEffect(() => {
    setName(campaign?.name ?? '')
    setBudget(campaign?.daily_budget ? Number(campaign.daily_budget) / 100 : 150)
    setError(null)
    setSuccess(false)
  }, [campaign?.id])

  async function handleSave() {
    if (!campaign) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const body: Record<string, unknown> = {}
      if (name !== campaign.name) body.name = name
      const originalBudget = campaign.daily_budget ? Number(campaign.daily_budget) / 100 : 150
      if (budget !== originalBudget) {
        if (budget < 50) throw new Error('Minimum daily budget is ₹50')
        if (budget > 100000) throw new Error('Maximum daily budget is ₹1,00,000')
        body.dailyBudgetPaise = Math.round(budget * 100)
      }

      if (Object.keys(body).length === 0) {
        onClose()
        return
      }

      const res = await fetch(`/api/admin/ads/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; issues?: unknown[] }
        throw new Error(data.error ?? 'Update failed')
      }

      setSuccess(true)
      onSave()
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {campaign && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="rounded-2xl border border-[rgba(109,40,217,0.15)] bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[#0F1B3D] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#6d28d9]" />
                  Edit Campaign
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close edit campaign modal"
                  className="rounded-lg p-2 text-[#6F7192] hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#6F7192] mb-1.5">Campaign Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6F7192] mb-1.5">Daily Budget (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
                    <input
                      type="number"
                      min={50}
                      max={100000}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-50 p-3 text-sm text-rose-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Campaign updated successfully!</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#6F7192] hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || success}
                  className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
