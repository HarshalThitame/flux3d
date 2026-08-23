import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildRateLimitKey, rateLimitCheck } from '@/lib/rate-limit'
import { verifyGuestOrderAccess } from '@/lib/shop/guest-access'
import { recordConsent } from '@/lib/account-linking/consent'
import { sendMagicLinkLogin } from '@/lib/email/triggers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type SendMagicLinkBody = {
  orderId?: unknown
  email?: unknown
  /**
   * Client's current tracking path (/3d-shop/track/<id>?token=…). Validated
   * against the order before being used as the post-login redirect target —
   * this endpoint would otherwise be an open-redirect into Supabase's
   * verification flow.
   */
  trackingPath?: unknown
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LINK_EXPIRY_MINUTES = 60

/**
 * Send a one-time login link so a guest can claim their order.
 *
 * Enumeration-safe: response shape/status/timing are identical whether or not
 * the orderId+email pair matches a guest order — the email only goes out when
 * BOTH match. Dual rate limits stop the endpoint probing "does this person
 * have an order with us".
 */
export async function POST(request: Request) {
  let body: SendMagicLinkBody
  try {
    body = (await request.json()) as SendMagicLinkBody
  } catch {
    return NextResponse.json({ ok: true })
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const trackingPath = typeof body.trackingPath === 'string' ? body.trackingPath : ''

  // Uniform handling even for malformed input — zero signal.
  if (!orderId || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true })
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

  const ipLimit = await rateLimitCheck(buildRateLimitKey(request, 'magic_link_send'), 3600, 10)
  if (!ipLimit.success) {
    return NextResponse.json({ ok: true })
  }
  const emailIpLimit = await rateLimitCheck(`magic_link_send_email:${email}:${ip}`, 3600, 5)
  if (!emailIpLimit.success) {
    return NextResponse.json({ ok: true })
  }

  try {
    // Ownership gate: only the holder of the guest access token for THIS
    // order may request its claim link.
    let authorizedOrderId: string | null = null
    let authorizedToken: string | null = null

    if (trackingPath.startsWith(`/3d-shop/track/${orderId}`)) {
      try {
        const url = new URL(`https://internal.local${trackingPath}`)
        const token = url.searchParams.get('token')?.trim() || ''
        const access = await verifyGuestOrderAccess(orderId, token)
        if (access && access.guestEmail?.toLowerCase() === email) {
          authorizedOrderId = access.orderId
          authorizedToken = token
        }
      } catch {
        // invalid trackingPath — falls through to unauthorized
      }
    }

    if (!authorizedOrderId || !authorizedToken) {
      // Same response as a hit — but no email is sent.
      return NextResponse.json({ ok: true })
    }

    // Post-login redirect target: back to the tracking page with the claim
    // banner. Constructed server-side from validated parts only.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'
    const nextPath = `/3d-shop/track/${authorizedOrderId}?token=${encodeURIComponent(authorizedToken)}&claimed=1`
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const admin = createAdminClient()

    // Existing account -> magiclink; brand-new email -> signup (auto-creates).
    // Both produce an action link; neither outcome is reflected in the response.
    // Signup needs a password param (Supabase API requirement) — we generate a
    // random one the user is never shown; they can reset it later.
    let actionLink: string | null = null
    const magiclink = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    if (magiclink.data?.properties?.action_link) {
      actionLink = magiclink.data.properties.action_link
    } else {
      const randomPassword = crypto.randomBytes(32).toString('base64url')
      const signup = await admin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: randomPassword,
        options: { redirectTo },
      })
      actionLink = signup.data?.properties?.action_link ?? null
      if (!actionLink && signup.error && !/already|exist/i.test(signup.error.message)) {
        console.error('[send-magic-link] generateLink failed:', signup.error.message)
      }
    }
    if (!actionLink && magiclink.error) {
      console.error('[send-magic-link] generateLink(magiclink) failed:', magiclink.error.message)
    }

    if (actionLink) {
      // The action link is a secret: it goes ONLY into the email body.
      await sendMagicLinkLogin(email, actionLink, LINK_EXPIRY_MINUTES)

      await recordConsent({
        consentType: 'account_linking',
        granted: true,
        method: 'button_click',
        details: {
          purpose: 'guest_claim_magic_link_sent',
          order_id: authorizedOrderId,
          expires_in_minutes: LINK_EXPIRY_MINUTES,
        },
      }).catch(() => undefined)
    }
  } catch (error) {
    // Never leak whether anything matched.
    console.error('[send-magic-link]', error instanceof Error ? error.message : error)
  }

  return NextResponse.json({ ok: true })
}
