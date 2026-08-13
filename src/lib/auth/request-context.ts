import { headers } from 'next/headers'

// ============================================================================
// Request Context Helpers
// ============================================================================
// Used by security-sensitive flows (password reset, password change) so the
// recipient of an email can verify the request came from their device.
// ============================================================================

export async function getClientIp(): Promise<string> {
  const forwarded = ((await headers()).get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return forwarded[0] ?? 'unknown'
}

function detectBrowser(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return 'Edge'
  if (/opr\//i.test(userAgent)) return 'Opera'
  if (/crios\//i.test(userAgent)) return 'Chrome (Mobile)'
  if (/fxios\//i.test(userAgent)) return 'Firefox (Mobile)'
  if (/chrome|crios/i.test(userAgent)) {
    return /mobile/i.test(userAgent) ? 'Chrome (Mobile)' : 'Chrome'
  }
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox'
  if (/safari/i.test(userAgent)) return 'Safari'
  if (/trident|msie/i.test(userAgent)) return 'Internet Explorer'
  return 'Browser'
}

function detectOs(userAgent: string): string {
  if (/windows nt/i.test(userAgent)) return 'Windows'
  if (/android/i.test(userAgent)) return 'Android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS'
  if (/mac os x|macintosh/i.test(userAgent)) return 'macOS'
  if (/linux/i.test(userAgent)) return 'Linux'
  return 'Unknown OS'
}

export async function getDeviceInfo(): Promise<string> {
  const userAgent = (await headers()).get('user-agent') ?? ''
  if (!userAgent) return 'Unknown device'
  return `${detectBrowser(userAgent)} on ${detectOs(userAgent)}`
}

export function formatChangedAt(date: Date = new Date()): string {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
