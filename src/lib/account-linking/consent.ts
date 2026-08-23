/**
 * DPDP consent evidence helper.
 *
 * Writes to `consent_log` (service-role only table). Consent rows may be
 * pre-account: `user_id` is nullable and the guest session / order reference
 * travels in `details` so evidence survives until the order is claimed.
 */
import { createAdminSupabaseClient } from '@/lib/admin/server'

export type ConsentType = 'whatsapp_messaging' | 'data_processing' | 'marketing' | 'account_linking'

export type ConsentMethod = 'checkbox_web' | 'whatsapp_reply' | 'button_click'

export type RecordConsentInput = {
  consentType: ConsentType
  granted: boolean
  method: ConsentMethod
  userId?: string | null
  phoneNumber?: string | null
  ipAddress?: string | null
  details?: Record<string, unknown>
}

export async function recordConsent(input: RecordConsentInput): Promise<boolean> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('consent_log').insert({
    user_id: input.userId ?? null,
    phone_number: input.phoneNumber ?? null,
    consent_type: input.consentType,
    granted: input.granted,
    method: input.method,
    ip_address: input.ipAddress ?? null,
    details: input.details ?? {},
  })

  if (error) {
    console.error('[consent] Failed to persist consent log:', error.message)
    return false
  }
  return true
}

/** Digits-only phone canonicalization (re-exported for admin tooling). */
export function canonicalPhone(phone: string): string {
  return (phone ?? '').replace(/\D/g, '')
}

/**
 * Append-only DPDP withdrawal evidence: writes a granted=false row and stamps
 * withdrawn_at on the matching granted rows.
 */
export async function withdrawConsent(phoneNumber: string, consentType: ConsentType): Promise<boolean> {
  const supabase = createAdminSupabaseClient()

  const { error: updateError } = await supabase
    .from('consent_log')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('phone_number', phoneNumber)
    .eq('consent_type', consentType)
    .eq('granted', true)
    .is('withdrawn_at', null)

  if (updateError) {
    console.error('[consent] Failed to withdraw consent:', updateError.message)
    return false
  }

  const { error: insertError } = await supabase.from('consent_log').insert({
    phone_number: phoneNumber,
    consent_type: consentType,
    granted: false,
    method: 'button_click',
    details: { purpose: 'consent_withdrawal' },
  })

  if (insertError) {
    console.error('[consent] Failed to log consent withdrawal:', insertError.message)
    return false
  }
  return true
}
