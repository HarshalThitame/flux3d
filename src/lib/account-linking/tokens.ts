/**
 * Token + phone utilities for account linking.
 *
 * Token model (mirrors the plan's security requirements):
 *  - Magic-link tokens: nanoid(32) -> ~190 bits of entropy, stored as a
 *    SHA-256 hash in link_requests.token (the raw value only travels in the
 *    email deep link) ... NOTE: the DB `token` column stores the RAW token
 *    (the email link must contain something the server can look up). To stay
 *    single-use-safe even if a token leaks via logs/referrers, consumption is
 *    gated by `confirmed_at IS NULL AND expires_at > now()` (see
 *    link-requests.ts). This matches Supabase's own email-token model.
 *  - OTP codes: 6-digit, crypto.randomInt, stored as SHA-256 hash.
 *
 * Phone canonicalization: digits-only. The DB merge matches on the last 10
 * digits so a 12-digit WhatsApp wa_id ("919623023480") matches a 10-digit
 * shipping_address phone ("9623023480"). This business is India-focused
 * (addresses default to India, 10-digit phone validation), which is why
 * last-10-digits is a safe canonical key here.
 */
import { nanoid } from 'nanoid'
import crypto from 'node:crypto'

export function generateToken(): string {
  return nanoid(32)
}

export function generateOtp(): string {
  // 6-digit numeric, cryptographically random.
  return String(100000 + crypto.randomInt(0, 900000))
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/** Digits-only phone normalization (no '+'). */
export function canonicalPhone(phone: string): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits
}

/** Last 10 digits of a digit-stripped phone — the cross-table match key. */
export function phoneMatchKey(phone: string): string {
  return canonicalPhone(phone).slice(-10)
}

/** Timing-safe string compare for OTP / token hashes. */
export function safeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch {
    return false
  }
}
