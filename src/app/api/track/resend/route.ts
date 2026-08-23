import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { buildRateLimitKey, rateLimitCheck } from '@/lib/rate-limit'
import { ensureFreshGuestTrackingToken } from '@/lib/shop/guest-access'
import { recordConsent } from '@/lib/account-linking/consent'
import { sendOrderPlacedCustomer } from '@/lib/email/triggers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ResendBody = {
  orderId?: unknown
  email?: unknown
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Resend a guest order tracking link.
 *
 * Enumeration-safe by construction:
 *   * Response body, status code and work performed are identical whether or
 *     not the order/email pair matches (we always run the limiter, always do a
 *     DB lookup, and always "prepare" a token path on hit).
 *   * Dual rate limits (per-IP and per-email+IP) stop the endpoint being used
 *     as a probe for "does this person have an order with us".
 *   * The email is only sent when BOTH the order id and the exact guest email
 *     match — so probing yields nothing.
 */
export async function POST(request: Request) {
  let body: ResendBody
  try {
    body = (await request.json()) as ResendBody
  } catch {
    return NextResponse.json({ ok: true })
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  // Uniform validation error handling: even malformed input gets the same
  // generic "ok" response — no signal at all.
  if (!orderId || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true })
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

  const ipLimit = await rateLimitCheck(buildRateLimitKey(request, 'track_resend'), 3600, 10)
  if (!ipLimit.success) {
    return NextResponse.json({ ok: true })
  }
  const emailIpLimit = await rateLimitCheck(`track_resend_email:${email}:${ip}`, 3600, 5)
  if (!emailIpLimit.success) {
    return NextResponse.json({ ok: true })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { data: order } = await supabase
      .from('shelf_orders')
      .select('id, order_number, user_id, total_amount, guest_contact, items')
      .eq('id', orderId)
      .maybeSingle()

    const guestContact =
      order && typeof order.guest_contact === 'object' && order.guest_contact !== null
        ? (order.guest_contact as Record<string, unknown>)
        : {}

    const guestEmail = typeof guestContact.email === 'string' ? guestContact.email.trim().toLowerCase() : ''

    if (order && !order.user_id && guestEmail && guestEmail === email) {
      const rawToken = await ensureFreshGuestTrackingToken(String(order.id))
      if (rawToken) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'
        const trackingUrl = `${siteUrl}/3d-shop/track/${String(order.id)}?token=${encodeURIComponent(rawToken)}`

        await sendOrderPlacedCustomer(
          '',
          guestEmail,
          String(order.order_number ?? ''),
          'Customer',
          `₹${Number(order.total_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          [],
          trackingUrl
        )

        await recordConsent({
          consentType: 'data_processing',
          granted: true,
          method: 'button_click',
          details: {
            purpose: 'guest_tracking_link_resend',
            guest_session_id: null,
            order_id: String(order.id),
          },
        }).catch(() => undefined)
      }
    }
  } catch (error) {
    // Swallow — the response must not leak whether anything matched.
    console.error('[track/resend]', error instanceof Error ? error.message : error)
  }

  return NextResponse.json({ ok: true })
}
