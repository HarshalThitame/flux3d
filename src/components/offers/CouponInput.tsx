'use client'

import { useState, useCallback } from 'react'
import { Ticket, Check, X, Percent, Loader2 } from 'lucide-react'

export type CouponResult = {
  valid: boolean
  coupon?: {
    id: string
    code: string
    discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
    discount_value: number
    max_discount: number | null
    min_order_value: number
    discount_amount: number
  }
  error?: string
}

type CouponInputProps = {
  orderAmount: number
  userId?: string | null
  onApply: (result: CouponResult) => void
  appliedCoupon: CouponResult | null
  onRemove: () => void
}

export default function CouponInput({ orderAmount, userId, onApply, appliedCoupon, onRemove }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleApply = useCallback(async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ code: trimmed, orderAmount: String(orderAmount) })
      if (userId) params.set('userId', userId)

      const res = await fetch(`/api/coupons/validate?${params}`)
      const data: CouponResult = await res.json()
      onApply(data)
      if (!data.valid) setError(data.error ?? 'Invalid coupon')
    } catch {
      setError('Failed to validate coupon')
    } finally {
      setLoading(false)
    }
  }, [code, orderAmount, userId, onApply])

  if (appliedCoupon?.valid) {
    const c = appliedCoupon.coupon
    return (
      <div className="rounded-xl border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.06)] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#10B981]" />
            <div>
              <code className="font-mono font-bold text-sm text-[#10B981]">{c?.code}</code>
              <p className="text-xs text-[#6F7192] mt-0.5">
                {c?.discount_type === 'percentage'
                  ? `${c?.discount_value}% off`
                  : c?.discount_type === 'fixed_amount'
                  ? `₹${c?.discount_value} off`
                  : 'Free shipping'}
                {c && c.discount_amount > 0 && (
                  <span className="font-semibold text-[#10B981] ml-1">
                    (saving ₹{c.discount_amount.toFixed(0)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[#6F7192] hover:text-[#EF4444] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            placeholder="Enter coupon code"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[rgba(109, 40, 217,0.2)] bg-white text-sm text-[#070b1d] outline-none focus:border-[#6d28d9] transition-colors"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="inline-flex items-center gap-1.5 bg-[#6d28d9] text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#4c1d95] transition-all min-h-[44px]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Percent className="w-4 h-4" />}
          Apply
        </button>
      </div>
      {error && <p className="text-xs text-[#EF4444] mt-1.5">{error}</p>}
    </div>
  )
}
