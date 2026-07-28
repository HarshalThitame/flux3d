import { Resend } from 'resend'
import { getBusinessSettings } from '@/lib/admin/business-settings'

/**
 * Resend ESP client singleton with dynamic configuration.
 *
 * Priority for API key:
 *   1. business_settings.resend_api_key (admin-configurable, cached)
 *   2. process.env.RESEND_API_KEY (fallback)
 *
 * This allows admins to rotate keys without redeploying.
 */
let cachedClient: Resend | null = null
let cachedKey: string | null = null
let cachedAt = 0
const CACHE_TTL_MS = 60_000 // 60 seconds

async function getResendApiKey(): Promise<string | null> {
  const envKey = process.env.RESEND_API_KEY
  if (envKey) return envKey

  // Fall back to database setting (with short cache)
  const now = Date.now()
  if (now - cachedAt < CACHE_TTL_MS && cachedKey) {
    return cachedKey
  }

  try {
    const settings = await getBusinessSettings()
    const dbKey = settings?.resendApiKey
    if (dbKey) {
      cachedKey = dbKey
      cachedAt = now
      return dbKey
    }
  } catch {
    // If DB is unreachable, rely on env var
  }

  return null
}

export async function getResendClient(): Promise<Resend> {
  const key = await getResendApiKey()
  if (!key) {
    throw new Error('[Resend] No API key configured. Set RESEND_API_KEY env var or configure in business settings.')
  }

  if (!cachedClient || cachedKey !== key) {
    cachedClient = new Resend(key)
    cachedKey = key
  }

  return cachedClient
}

/**
 * Build the sender address from business settings or defaults.
 */
export async function getSenderAddress(): Promise<{ name: string; email: string }> {
  const settings = await getBusinessSettings().catch(() => null)

  const name =
    settings?.resendSenderName ||
    settings?.businessName ||
    settings?.smtpSenderName ||
    'Flux3D'

  const email =
    settings?.resendSenderEmail ||
    settings?.smtpSenderEmail ||
    'noreply@updates.flux3d.in'

  return { name, email }
}

export function clearResendCache() {
  cachedClient = null
  cachedKey = null
  cachedAt = 0
}
