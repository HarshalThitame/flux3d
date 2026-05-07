import { getSupabaseUrl } from '@/lib/supabase/config'

function extractOwnedStoragePathFromUrl(value: string) {
  try {
    const parsed = new URL(value)
    const supabaseOrigin = new URL(getSupabaseUrl()).origin

    if (parsed.origin !== supabaseOrigin) {
      return null
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'
    const publicPrefix = `/storage/v1/object/public/${bucket}/`
    const signedPrefix = `/storage/v1/object/sign/${bucket}/`

    if (parsed.pathname.startsWith(publicPrefix)) {
      return parsed.pathname.slice(publicPrefix.length)
    }

    if (parsed.pathname.startsWith(signedPrefix)) {
      return parsed.pathname.slice(signedPrefix.length)
    }

    return null
  } catch {
    return null
  }
}

export function normalizeOwnedStoragePath(value: string, ownerId: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error('File path is missing.')
  }

  if (trimmed.includes('\\')) {
    throw new Error('Invalid file path.')
  }

  if (trimmed.includes('..')) {
    throw new Error('Invalid file path.')
  }

  const normalizedPath = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? extractOwnedStoragePathFromUrl(trimmed)
    : trimmed

  if (!normalizedPath) {
    throw new Error('Invalid file path.')
  }

  if (normalizedPath.startsWith('/') || normalizedPath.includes('://')) {
    throw new Error('Invalid file path.')
  }

  if (!normalizedPath.startsWith(`${ownerId}/`)) {
    throw new Error('File path does not belong to the current account.')
  }

  return normalizedPath
}
