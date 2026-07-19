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

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_LOG_PATTERNS.some((pattern) => pattern.test(key))
}

export function redactSensitiveString(text: string): string {
  return text
    .replace(/(api[_-]?key|apikey)[\s]*[=:][\s]*['"]?([\w-]+)['"]?/gi, '$1=***')
    .replace(/(secret)[\s]*[=:][\s]*['"]?([\w-]+)['"]?/gi, '$1=***')
    .replace(/(password)[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi, '$1=***')
    .replace(/(token)[\s]*[=:][\s]*['"]?([\w-]+)['"]?/gi, '$1=***')
}

export function redactErrorForResponse(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return redactSensitiveString(message)
}
