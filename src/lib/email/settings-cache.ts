import { createAdminClient } from '@/lib/supabase/admin'
import type { EmailSettingsRow } from '../../../types/database'

// ============================================================================
// Email Settings Cache
// ============================================================================
// Lightweight singleton cache for email_settings to avoid DB round-trips
// on every email enqueue/dispatch. TTL = 30 seconds.
// ============================================================================

let cachedSettings: EmailSettingsRow | null = null
let cachedAt = 0
const CACHE_TTL_MS = 30_000

export async function getEmailSettings(): Promise<EmailSettingsRow | null> {
  const now = Date.now()
  if (now - cachedAt < CACHE_TTL_MS && cachedSettings) {
    return cachedSettings
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('email_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (error) {
    console.warn('[email-settings-cache] Failed to fetch settings:', error.message)
    return cachedSettings
  }

  cachedSettings = (data as EmailSettingsRow | null) ?? null
  cachedAt = now
  return cachedSettings
}

export function clearEmailSettingsCache() {
  cachedSettings = null
  cachedAt = 0
}

export function isEmailSendingAllowed(settings: EmailSettingsRow | null): {
  allowed: boolean
  reason?: string
} {
  if (!settings) return { allowed: true }

  if (settings.pause_all_emails) {
    return { allowed: false, reason: 'All emails are paused via admin settings' }
  }

  if (!settings.emails_enabled) {
    return { allowed: false, reason: 'Emails are globally disabled via admin settings' }
  }

  return { allowed: true }
}

export function isMaintenanceModeBlocking(
  settings: EmailSettingsRow | null,
  emailType: string
): { blocked: boolean; reason?: string } {
  if (!settings || !settings.maintenance_mode) {
    return { blocked: false }
  }

  // In maintenance mode, only allow admin-critical emails
  const adminCriticalTypes = [
    'order_placed_admin',
    'contact_notification',
    'model_validation_pass',
    'model_validation_fail',
    'payment_failed',
  ]

  if (adminCriticalTypes.includes(emailType)) {
    return { blocked: false }
  }

  return {
    blocked: true,
    reason: `Maintenance mode is active. Non-critical email type "${emailType}" is blocked.`,
  }
}
