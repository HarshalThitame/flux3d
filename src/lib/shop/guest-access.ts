/**
 * Guest order access tokens.
 *
 * Model: a random 256-bit token is generated once per guest order. Only its
 * SHA-256 hash is persisted (`shelf_orders.guest_access_token_hash`); the raw
 * token travels to the checkout client exactly once (order-create response)
 * and in tracking/resend emails. Verification is a timing-safe compare, so a
 * DB dump or timing attack cannot recover valid links.
 *
 * A new raw token can be minted at any time (`ensureFreshGuestTrackingToken`)
 * — e.g. before emailing a tracking link — which invalidates earlier links.
 * This is deliberate: it lets post-payment webhook flows email a working link
 * without ever persisting the raw value.
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
}

/**
 * Verify that a raw guest token authorizes access to an order.
 * Returns false for logged-in orders (no token stored) or unknown orders.
 */
export async function verifyGuestOrderAccess(orderId: string, rawToken: string): Promise<GuestOrderAccess | null> {
  if (!orderId || !rawToken) return null

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_orders')
    .select('id, user_id, guest_access_token_hash')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) return null

  const storedHash = typeof data.guest_access_token_hash === 'string' ? data.guest_access_token_hash : ''
  if (!data.user_id && storedHash) {
    if (safeHashEqual(hashGuestAccessToken(rawToken), storedHash)) {
      return { orderId: String(data.id), isGuest: true }
    }
  }
  return null
}

/**
 * Mint (or rotate) the raw tracking token for a guest order and persist only
 * its hash. Returns null for non-guest orders.
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
    .update({ guest_access_token_hash: hashGuestAccessToken(raw) })
    .eq('id', orderId)

  if (error) {
    console.error('[guest-access] Failed to store tracking token hash:', error.message)
    return null
  }

  return raw
}
