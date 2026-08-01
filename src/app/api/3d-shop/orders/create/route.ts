import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import {
  normalizeOrderItems,
  normalizeShippingAddress,
  placeShopOrder,
} from '@/lib/shop/place-order'


export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CreateShopOrderBody = {
  items?: unknown
  couponCode?: unknown
  appliedCouponId?: unknown
  appliedOfferId?: unknown
  shippingAddress?: unknown
}

export async function POST(request: Request) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = authData.user.id

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'shop_checkout',
    windowSeconds: 60,
    maxRequests: 10,
    userId,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as CreateShopOrderBody
    const items = normalizeOrderItems(body.items)
    const shippingAddress = normalizeShippingAddress(body.shippingAddress)
    const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim()
      ? body.couponCode.trim().toUpperCase()
      : null
    const appliedCouponId = typeof body.appliedCouponId === 'string' && body.appliedCouponId.trim()
      ? body.appliedCouponId.trim()
      : null
    const appliedOfferId = typeof body.appliedOfferId === 'string' && body.appliedOfferId.trim()
      ? body.appliedOfferId.trim()
      : null

    const result = await placeShopOrder({
      userId,
      items,
      shippingAddress,
      couponCode,
      appliedCouponId,
      appliedOfferId,
      source: 'shop',
      paymentProvider: 'razorpay',
    })

    // NOTE: Emails are now sent only after successful payment capture,
    // triggered from the payment verification flow and webhook handler.
    // We do NOT send order-placed emails at creation time anymore.

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to place order.'
    const isValidationError = /out of stock|invalid item|empty|address|pincode|phone|coupon|offer|delivery not available/i.test(message)
    return NextResponse.json({ error: message }, { status: isValidationError ? 400 : 500 })
  }
}
