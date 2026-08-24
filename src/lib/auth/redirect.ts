import { siteUrl } from '@/lib/site'

export function normalizeNextPath(value: string | null | undefined, fallback = '/') {
  if (!value) {
    return fallback
  }

  const normalized = value.trim()

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return fallback
  }

  return normalized
}

export async function getAuthCallbackUrl(nextPath: string) {
  return `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`
}
