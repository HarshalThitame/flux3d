import { createAdminClient } from '@/lib/supabase/admin'
import { generateToken, canonicalPhone, hashOtp, safeEqual } from './tokens'
import type {
  LinkRequestRecord,
  CreateLinkRequestInput,
  LinkMethod,
} from './types'

const DEFAULT_TTL_MINUTES = 15

/** Create a single link/otp request row. Returns the issued token (raw). */
export async function createLinkRequest(
  input: CreateLinkRequestInput,
): Promise<{ token: string; linkRequest: LinkRequestRecord } | null> {
  const db = createAdminClient()
  const token = generateToken()
  const phone = canonicalPhone(input.targetPhone)
  if (!phone) return null

  const ttlMinutes = input.ttlMinutes ?? DEFAULT_TTL_MINUTES
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()

  // Atomic: delete any stale unconfirmed request for this phone, then insert
  await db
    .from('link_requests')
    .delete()
    .eq('target_phone', phone)
    .is('confirmed_at', null)

  const { data, error } = await db
    .from('link_requests')
    .insert({
      token,
      initiated_from: input.initiatedFrom,
      method: input.method,
      target_user_id: input.targetUserId ?? null,
      target_phone: phone,
      target_email: input.targetEmail ?? null,
      expires_at: expiresAt,
      ip_address: input.ipAddress ?? null,
    })
    .select('*')
    .maybeSingle()

  if (error || !data) {
    console.error('[account-linking] createLinkRequest failed:', error?.message)
    return null
  }

  return { token, linkRequest: data as LinkRequestRecord }
}

/**
 * Consume a magic-link token. Atomic: only updates a row that is still
 * unconfirmed and unexpired. Returns the now-confirmed row, or null if the
 * token was already used / expired / not found.
 */
export async function consumeLinkRequestByToken(
  token: string,
): Promise<LinkRequestRecord | null> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('link_requests')
    .update({ confirmed_at: now })
    .eq('token', token)
    .is('confirmed_at', null)
    .gt('expires_at', now)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[account-linking] consumeLinkRequestByToken failed:', error.message)
  }
  return (data ?? null) as LinkRequestRecord | null
}

/**
 * Read (without consuming) a pending, unexpired request by its raw token.
 * Never mutates the row — used for preview rendering so opening the link
 * does not burn the single-use token (consumption happens only on confirm).
 */
export async function getLinkRequestByToken(
  token: string,
): Promise<LinkRequestRecord | null> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('link_requests')
    .select('*')
    .eq('token', token)
    .is('confirmed_at', null)
    .gt('expires_at', now)
    .maybeSingle()

  if (error) {
    console.error('[account-linking] getLinkRequestByToken failed:', error.message)
  }
  return (data ?? null) as LinkRequestRecord | null
}

/** Read (without consuming) a pending, unexpired request for a phone. */
export async function getPendingRequestByPhone(
  phone: string,
): Promise<LinkRequestRecord | null> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  const matched = canonicalPhone(phone)
  const { data, error } = await db
    .from('link_requests')
    .select('*')
    .eq('target_phone', matched)
    .is('confirmed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (error) {
    console.error('[account-linking] getPendingRequestByPhone failed:', error.message)
  }
  return (data ?? null) as LinkRequestRecord | null
}

/**
 * Issue a WhatsApp OTP for an already-created request (method === 'whatsapp_otp').
 * Stores the OTP hash and returns the raw code to send over WhatsApp.
 */
export async function issueOtpForRequest(
  requestId: string,
  code: string,
): Promise<boolean> {
  const db = createAdminClient()
  const { error } = await db
    .from('link_requests')
    .update({ otp_code_hash: hashOtp(code) })
    .eq('id', requestId)
    .eq('method', 'whatsapp_otp')

  if (error) {
    console.error('[account-linking] issueOtpForRequest failed:', error.message)
    return false
  }
  return true
}

/**
 * Verify a WhatsApp OTP for a pending request on the given phone.
 * Returns the confirmed request on success, or null on any mismatch / expiry.
 * NOTE: Supabase's `.gt('expires_at', now)` compares the column to a string
 * literal; Postgres casts it implicitly, which is fine for TIMESTAMPTZ.
 */
export async function verifyOtpForPhone(
  phone: string,
  code: string,
): Promise<LinkRequestRecord | null> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  const matched = canonicalPhone(phone)

  const { data: request, error: selErr } = await db
    .from('link_requests')
    .select('*')
    .eq('target_phone', matched)
    .eq('method', 'whatsapp_otp')
    .not('otp_code_hash', 'is', null)
    .is('confirmed_at', null)
    .gt('expires_at', now)
    .maybeSingle()

  if (selErr || !request) {
    if (selErr) console.error('[account-linking] verifyOtpForPhone lookup failed:', selErr.message)
    return null
  }

  if (!safeEqual(hashOtp(code), String(request.otp_code_hash ?? ''))) {
    return null
  }

  const { data: confirmed, error: updErr } = await db
    .from('link_requests')
    .update({ confirmed_at: now })
    .eq('id', request.id)
    .is('confirmed_at', null)
    .gt('expires_at', now)
    .select('*')
    .maybeSingle()

  if (updErr || !confirmed) return null
  return confirmed as LinkRequestRecord
}

export { generateToken, canonicalPhone, hashOtp, safeEqual }
export type { LinkRequestRecord, LinkMethod }
