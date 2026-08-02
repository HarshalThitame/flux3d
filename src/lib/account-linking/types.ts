/**
 * Shared types for the WhatsApp <-> Website account linking feature.
 *
 * These describe DB rows (link_requests / consent_log) and the inputs/outputs
 * of the public functions in this folder. All DB access uses the service-role
 * client (see ../supabase/admin), matching the whatsapp_order_sessions pattern.
 */

export type LinkMethod = 'email_magic_link' | 'whatsapp_otp'
export type LinkInitiatedFrom = 'whatsapp' | 'web'

export interface LinkRequestRecord {
  id: string
  token: string
  initiated_from: LinkInitiatedFrom
  method: LinkMethod
  target_user_id: string | null
  target_phone: string
  target_email: string | null
  otp_code_hash: string | null
  expires_at: string
  confirmed_at: string | null
  ip_address: string | null
  created_at: string
}

export interface CreateLinkRequestInput {
  initiatedFrom: LinkInitiatedFrom
  method: LinkMethod
  /** Raw phone (wa_id, E.164, or 10-digit). Canonicalized before storage. */
  targetPhone: string
  targetEmail?: string | null
  targetUserId?: string | null
  /** Minutes until the request/otp expires. Default 15. */
  ttlMinutes?: number
  ipAddress?: string | null
}

export interface MergeResult {
  /** Number of shelf_orders rows reassigned to the target account. */
  ordersAttributed: number
}

export interface ConsentInput {
  userId?: string | null
  phoneNumber?: string | null
  consentType: 'whatsapp_messaging' | 'data_processing' | 'marketing' | 'account_linking'
  granted: boolean
  method: 'checkbox_web' | 'whatsapp_reply' | 'button_click'
  ipAddress?: string | null
  details?: Record<string, unknown>
}

export class AccountLinkingError extends Error {
  constructor(
    message: string,
    public readonly code: 'expired' | 'already_used' | 'not_found' | 'invalid' | 'rate_limited',
  ) {
    super(message)
    this.name = 'AccountLinkingError'
  }
}
