import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalPhone } from './tokens'
import type { ConsentInput } from './types'

/** Persist a consent record (DPDP evidence). */
export async function recordConsent(input: ConsentInput): Promise<string | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('consent_log')
    .insert({
      user_id: input.userId ?? null,
      phone_number: input.phoneNumber ? canonicalPhone(input.phoneNumber) : null,
      consent_type: input.consentType,
      granted: input.granted,
      method: input.method,
      ip_address: input.ipAddress ?? null,
      details: (input.details ?? {}) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[account-linking] recordConsent failed:', error.message)
    return null
  }
  return data?.id ?? null
}

/**
 * Withdraw a previously-granted consent for a phone + consent_type.
 * Inserts a new granted=false row with withdrawn_at set (append-only audit).
 */
export async function withdrawConsent(
  phone: string,
  consentType: ConsentInput['consentType'],
  ipAddress?: string | null,
): Promise<string | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('consent_log')
    .insert({
      phone_number: canonicalPhone(phone),
      consent_type: consentType,
      granted: false,
      method: 'button_click',
      ip_address: ipAddress ?? null,
      details: { withdrawn: true },
      timestamp: new Date().toISOString(),
      withdrawn_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[account-linking] withdrawConsent failed:', error.message)
    return null
  }
  return data?.id ?? null
}

export { canonicalPhone }
