import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimitCheck, rateLimitResponse } from '@/lib/rate-limit'
import {
  normalizeOrderItems,
  normalizeShippingAddress,
  placeShopOrder,
} from '@/lib/shop/place-order'
import { generateGuestAccessToken, hashGuestAccessToken } from '@/lib/shop/guest-access'
import { recordConsent } from '@/lib/account-linking/consent'


export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CreateShopOrderBody = {
  items?: unknown
  couponCode?: unknown
  appliedCouponId?: unknown
  appliedOfferId?: unknown
  shippingAddress?: unknown
  /** Present only for guest (unauthenticated) checkout. */
  guest?: {
    sessionId?: unknown
    email?: unknown
  }
  /** DPDP: explicit data-processing consent checkbox (guest checkout only). */
  consentDataProcessing?: unknown
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  let userId: string | null = null
  if (!authError && authData.user) {
    userId = authData.user.id
  }

  let body: CreateShopOrderBody
  try {
    body = (await request.json()) as CreateShopOrderBody
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // Guest identity + rate limiting.
  //
  // Layered limits stop scripted abuse of the endpoint and make the silent
  // email-match logic unreachable at probe volume:
  //   * IP:            10 / minute   (same as logged-in checkout)
  //   * email:          5 / hour     (secondary key)
  //   * guest session: 10 / day      (stops localStorage-reset abuse)
  // The response shape is identical whether or not the email matches an
  // existing account — no enumeration signal here or downstream.
  // ---------------------------------------------------------------------------
  let guestSessionId: string | null = null
  let guestEmail: string | null = null

  if (!userId) {
    guestSessionId = normalizeText(body.guest?.sessionId)
    guestEmail = normalizeText(body.guest?.email).toLowerCase()

    if (!UUID_RE.test(guestSessionId)) {
      return NextResponse.json({ error: 'Invalid checkout session.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(guestEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address for order updates.' }, { status: 400 })
    }
    if (body.consentDataProcessing !== true) {
      return NextResponse.json({ error: 'Please accept the data processing consent to continue.' }, { status: 400 })
    }
  }

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'shop_checkout',
    windowSeconds: 60,
    maxRequests: 10,
    userId: userId ?? undefined,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  if (!userId) {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

    const emailLimit = await rateLimitCheck(`shop_checkout_email:${guestEmail}:${ip}`, 3600, 5)
    if (!emailLimit.success) {
      return NextResponse.json({ error: 'Too many orders attempted with this email. Please try again later.' }, { status: 429 })
    }

    const sessionLimit = await rateLimitCheck(`shop_checkout_session:${guestSessionId}`, 86400, 10)
    if (!sessionLimit.success) {
      return NextResponse.json({ error: 'Too many orders from this session. Please contact support.' }, { status: 429 })
    }
  }

  try {
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

    const guestAccessToken = userId ? null : generateGuestAccessToken()

    const result = await placeShopOrder({
      userId,
      guest: userId || !guestAccessToken || !guestEmail || !guestSessionId
        ? null
        : {
            sessionId: guestSessionId,
            email: guestEmail,
            accessTokenHash: hashGuestAccessToken(guestAccessToken),
          },
      items,
      shippingAddress,
      couponCode,
      appliedCouponId,
      appliedOfferId,
      source: 'shop',
      paymentProvider: 'razorpay',
    })

    // DPDP: persist the explicit checkout consent (never bundled with T&Cs).
    if (!userId) {
      await recordConsent({
        consentType: 'data_processing',
        granted: true,
        method: 'checkbox_web',
        phoneNumber: shippingAddress.phone,
        details: {
          purpose: 'guest_checkout_order_fulfilment',
          guest_session_id: guestSessionId,
          order_id: result.orderId,
        },
      }).catch(() => undefined)
    }

    // NOTE: Emails are now sent only after successful payment capture,
    // triggered from the payment verification flow and webhook handler.
    // We do NOT send order-placed emails at creation time anymore.

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      ...(guestAccessToken
        ? { guestToken: guestAccessToken }
        : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to place order.'
    const isValidationError = /out of stock|invalid item|empty|address|pincode|phone|coupon|offer|delivery not available/i.test(message)
    return NextResponse.json({ error: message }, { status: isValidationError ? 400 : 500 })
  }
}
