/**
 * Guest order access tokens.
 *
 * Two independent secrets per guest order:
 *   - checkout/payment token (`guest_access_token_hash`): issued once at
 *     checkout, never rotated until the order is claimed/anonymized. Used by
 *     payment create-order/verify/status APIs.
 *   - email-link token (`guest_email_token_hash`): rotated every time a
 *     receipt/resend email needs a tracking link, invalidating earlier
 *     emailed links. Tracking pages accept either token.
 *
 * Only SHA-256 hashes are persisted; raw tokens travel to the client once
 * (checkout response) or inside emails. Verification is timing-safe.
 */
import crypto from 'node:crypto'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export function generateGuestAccessToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashGuestAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Timing-safe comparison of two token hashes (equal-length hex digests). */
export function safeHashEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch {
    return false
  }
}

export type GuestOrderAccess = {
  orderId: string
  isGuest: boolean
  /** Lowercased email snapshot from guest_contact (null if absent). */
  guestEmail: string | null
}

/**
 * Verify that a raw guest token authorizes access to an order.
 *
 * Accepts EITHER token:
 *   - the stable checkout/payment token (guest_access_token_hash), or
 *   - the rotated email-link token (guest_email_token_hash) from receipt /
 *     resend emails.
 * Returns false for logged-in orders (no tokens stored) or unknown orders.
 */
export async function verifyGuestOrderAccess(orderId: string, rawToken: string): Promise<GuestOrderAccess | null> {
  if (!orderId || !rawToken) return null

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_orders')
    .select('id, user_id, guest_access_token_hash, guest_email_token_hash, guest_contact')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) return null

  const contact = data.guest_contact && typeof data.guest_contact === 'object'
    ? (data.guest_contact as Record<string, unknown>)
    : {}
  const guestEmail = typeof contact.email === 'string' ? contact.email.trim().toLowerCase() : null

  if (data.user_id) return null

  const candidate = hashGuestAccessToken(rawToken)
  const checkoutHash = typeof data.guest_access_token_hash === 'string' ? data.guest_access_token_hash : ''
  const emailHash = typeof data.guest_email_token_hash === 'string' ? data.guest_email_token_hash : ''

  if (
    (checkoutHash && safeHashEqual(candidate, checkoutHash)) ||
    (emailHash && safeHashEqual(candidate, emailHash))
  ) {
    return { orderId: String(data.id), isGuest: true, guestEmail }
  }
  return null
}

/**
 * Mint (or rotate) the EMAIL-link tracking token for a guest order and
 * persist only its hash.
 *
 * IMPORTANT: this rotates `guest_email_token_hash` — never the checkout
 * token (`guest_access_token_hash`). Rotating the checkout token raced with
 * in-flight payment verification and locked guests out of the verify call.
 * Tracking surfaces accept either token; payment APIs accept only checkout.
 */
export async function ensureFreshGuestTrackingToken(orderId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient()

  const { data: order } = await supabase
    .from('shelf_orders')
    .select('id, user_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order || order.user_id) return null

  const raw = generateGuestAccessToken()
  const { error } = await supabase
    .from('shelf_orders')
    .update({ guest_email_token_hash: hashGuestAccessToken(raw) })
    .eq('id', orderId)

  if (error) {
    console.error('[guest-access] Failed to store tracking token hash:', error.message)
    return null
  }

  return raw
}
