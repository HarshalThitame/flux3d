import type { BusinessSettings } from '@/lib/admin/business-settings'

export const SENSITIVE_SETTING_KEYS = new Set([
  'smtpPassword',
  'accountNumber',
  'ifscCode',
  'bankAccountName',
  'bankName',
  'upiId',
  'upiQrCodeUrl',
  'razorpayKeyId',
])

export const SENSITIVE_LOG_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /bank/i,
  /account/i,
  /ifsc/i,
  /upi/i,
  /smtp/i,
]

export function maskSecret(value: string | null | undefined, maskLength = 8): string {
  if (!value || value.length <= 4) return value ? '****' : ''
  const visible = Math.max(0, value.length - maskLength)
  return `${value.slice(0, Math.min(4, visible))}${'*'.repeat(maskLength)}`
}

export function maskBusinessSettings(settings: BusinessSettings): BusinessSettings {
  const masked = { ...settings }
  for (const key of SENSITIVE_SETTING_KEYS) {
    const value = (masked as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.length > 0) {
      ;(masked as Record<string, unknown>)[key] = maskSecret(value)
    }
  }
  return masked
}

/**
 * Checks whether a given key name is considered sensitive.
 * Uses exact-set matching first (highest precision) then falls back
 * to the regex pattern list to catch unknown dynamic keys.
 */
export function isSensitiveKey(key: string): boolean {
  // Exact match wins first — covers all known payment/auth credential keys
  if (SENSITIVE_SETTING_KEYS.has(key)) return true
  // Pattern match as a secondary net for dynamically named sensitive fields
  return SENSITIVE_LOG_PATTERNS.some((pattern) => pattern.test(key))
}

export function redactSensitiveValues(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    return redactSensitiveString(value)
  }
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValues)
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => {
        if (isSensitiveKey(key)) {
          return [key, typeof val === 'string' ? maskSecret(val) : '***']
        }
        return [key, redactSensitiveValues(val)]
      })
    )
  }
  return value
}

/**
 * Redact for audit log storage.
 *
 * Differs from redactSensitiveValues in two ways:
 * 1. Enforces a maximum object depth (default: 5) to prevent unbounded
 *    JSONB payloads in audit tables.
 * 2. Returns '[truncated]' for sub-trees that exceed the depth limit,
 *    making the truncation explicit and auditable.
 */
export function redactForAuditLog(value: unknown, maxDepth = 5): unknown {
  return _redactDepth(value, 0, maxDepth)
}

function _redactDepth(value: unknown, depth: number, maxDepth: number): unknown {
  if (depth >= maxDepth) return '[truncated]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return redactSensitiveString(value)
  if (Array.isArray(value)) {
    return value.map((v) => _redactDepth(v, depth + 1, maxDepth))
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => {
        if (isSensitiveKey(key)) {
          return [key, typeof val === 'string' ? maskSecret(val) : '***']
        }
        return [key, _redactDepth(val, depth + 1, maxDepth)]
      })
    )
  }
  return value
}

export function redactSensitiveString(text: string): string {
  return text
    .replace(/(api[_-]?key|apikey)[\s]*[=:][\s]*['"']?([\w-]+)['"']?/gi, '$1=***')
    .replace(/(secret)[\s]*[=:][\s]*['"']?([\w-]+)['"']?/gi, '$1=***')
    .replace(/(password)[\s]*[=:][\s]*['"']?([^\s'"]+)['"']?/gi, '$1=***')
    .replace(/(token)[\s]*[=:][\s]*['"']?([\w-]+)['"']?/gi, '$1=***')
}

export function redactErrorForResponse(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return redactSensitiveString(message)
}
