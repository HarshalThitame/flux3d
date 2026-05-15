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
  const origin = process.env.NEXT_PUBLIC_SITE_URL

  if (!origin) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required to build auth callback URLs.')
  }

  return `${origin.replace(/\/+$/, '')}/auth/callback?next=${encodeURIComponent(nextPath)}`
}
