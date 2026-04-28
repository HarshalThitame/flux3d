import { headers } from 'next/headers'

export function normalizeNextPath(value: string | null | undefined, fallback = '/instant-quote') {
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
  const headerStore = await headers()
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    headerStore.get('origin') ??
    'http://localhost:3000'

  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
}
