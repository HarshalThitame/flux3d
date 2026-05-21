'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Percent, Tag, X } from 'lucide-react'
import type { AppliedCoupon, AppliedOffer } from '@/lib/cart/types'
import { formatShopPrice } from '@/lib/shop/selection'
import { useShopCartStore } from '@/stores/shopCartStore'

type CouponValidationResult = {
  valid: boolean
  coupon?: AppliedCoupon
  error?: string
}

type AutoOfferResult = {
  valid: boolean
  offer?: AppliedOffer | null
}

function getCouponDescription(coupon: AppliedCoupon) {
  if (coupon.discount_type === 'percentage') {
    return `${coupon.discount_value}% off`
  }

  if (coupon.discount_type === 'fixed_amount') {
    return `${formatShopPrice(coupon.discount_value)} off`
  }

  return 'Free shipping'
}

export function useShopCartPromotionSync(orderAmount: number) {
  const couponCode = useShopCartStore((state) => state.couponCode)
  const appliedCoupon = useShopCartStore((state) => state.appliedCoupon)
  const applyCoupon = useShopCartStore((state) => state.applyCoupon)
  const removeCoupon = useShopCartStore((state) => state.removeCoupon)
  const setAutoApplyOffer = useShopCartStore((state) => state.setAutoApplyOffer)

  useEffect(() => {
    let cancelled = false

    fetch('/api/offers/auto-apply')
      .then((response) => response.json())
      .then((data: AutoOfferResult) => {
        if (cancelled) {
          return
        }

        setAutoApplyOffer(data.valid && data.offer ? data.offer : null)
      })
      .catch(() => {
        if (!cancelled) {
          setAutoApplyOffer(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [setAutoApplyOffer])

  useEffect(() => {
    const code = couponCode?.trim()
    if (!code || appliedCoupon || orderAmount <= 0) {
      return
    }

    let cancelled = false
    const params = new URLSearchParams({
      code,
      orderAmount: String(orderAmount),
    })

    fetch(`/api/coupons/validate?${params}`)
      .then((response) => response.json())
      .then((data: CouponValidationResult) => {
        if (cancelled) {
          return
        }

        if (data.valid && data.coupon) {
          applyCoupon(data.coupon)
          return
        }

        removeCoupon()
      })
      .catch(() => {
        // Keep the saved code if validation cannot be reached.
      })

    return () => {
      cancelled = true
    }
  }, [appliedCoupon, applyCoupon, couponCode, orderAmount, removeCoupon])
}

export function ShopCouponInput({
  orderAmount,
  appliedCoupon,
  couponCode,
}: {
  orderAmount: number
  appliedCoupon: AppliedCoupon | null
  couponCode: string | null
}) {
  const applyCoupon = useShopCartStore((state) => state.applyCoupon)
  const removeCoupon = useShopCartStore((state) => state.removeCoupon)
  const [code, setCode] = useState(couponCode ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleApply = useCallback(async () => {
    const trimmed = code.trim().toUpperCase().replace(/\s+/g, '')
    if (!trimmed || loading) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        code: trimmed,
        orderAmount: String(orderAmount),
      })
      const response = await fetch(`/api/coupons/validate?${params}`)
      const data = (await response.json()) as CouponValidationResult

      if (!response.ok || !data.valid || !data.coupon) {
        setError(data.error ?? 'Invalid coupon')
        return
      }

      applyCoupon(data.coupon)
      setCode(data.coupon.code)
    } catch {
      setError('Failed to validate coupon')
    } finally {
      setLoading(false)
    }
  }, [applyCoupon, code, loading, orderAmount])

  const handleRemoveCoupon = useCallback(() => {
    setCode('')
    setError('')
    removeCoupon()
  }, [removeCoupon])

  if (appliedCoupon) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <code className="font-mono text-sm font-bold text-emerald-700">{appliedCoupon.code}</code>
              <p className="mt-0.5 text-xs text-emerald-700/85">
                {getCouponDescription(appliedCoupon)}
                {appliedCoupon.discount_amount > 0 && (
                  <span className="ml-1 font-semibold">
                    saving {formatShopPrice(appliedCoupon.discount_amount)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveCoupon}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-emerald-700 hover:bg-white"
            aria-label={`Remove ${appliedCoupon.code} coupon`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void handleApply()
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase())
              setError('')
            }}
            placeholder="Coupon code"
            className="min-h-[44px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-soft)] px-3 pl-9 text-sm outline-none focus:border-[var(--border-brand)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--border-light)] px-4 text-sm font-bold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
          Apply
        </button>
      </form>
      {couponCode && (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span>{couponCode} is not applicable to the current 3D Shop cart.</span>
          <button type="button" onClick={handleRemoveCoupon} className="shrink-0 font-bold text-[var(--brand-primary)]">
            Remove
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

export function ShopAppliedOffer({
  offer,
}: {
  offer: AppliedOffer | null
}) {
  if (!offer || (offer.discount_amount <= 0 && !offer.free_shipping)) {
    return null
  }

  return (
    <div className="rounded-xl border border-[var(--border-brand)] bg-[var(--brand-faint)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--brand-primary)]">
        <div className="flex min-w-0 items-center gap-2">
          <Tag className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-semibold">
            {offer.badge_text ?? offer.sale_label ?? offer.title}
          </span>
        </div>
        <span className="shrink-0 text-xs font-bold">
          {offer.free_shipping ? 'Free shipping' : `-${formatShopPrice(offer.discount_amount)}`}
        </span>
      </div>
    </div>
  )
}
